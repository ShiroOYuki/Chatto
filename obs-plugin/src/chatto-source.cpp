// SPDX-License-Identifier: GPL-3.0-or-later
//
// The "Chatto Chat" source: a private obs-browser source that shows Chatto's
// embed page, or a bundled waiting page while Chatto is not running. The
// chat itself is drawn by Chatto's page; this plugin only points the browser
// at the right place.
#include "chatto-source.hpp"

#include "chatto-client.hpp"
#include "chatto-watcher.hpp"

#include <obs-module.h>
#include <plugin-support.h>

#include <mutex>
#include <optional>
#include <string>

namespace chatto {
namespace {

constexpr const char *kSourceId = "chatto_chat";
constexpr int kDefaultWidth = 420;
constexpr int kDefaultHeight = 600;
/** obs-browser's own default, so the page's transparent background shows through. */
constexpr const char *kTransparentCss = "body { background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; }";

struct ChattoSource {
	obs_source_t *self = nullptr;
	obs_source_t *browser = nullptr;

	std::mutex mutex;
	std::string theme;
	int port = kDefaultPort;
	int width = kDefaultWidth;
	int height = kDefaultHeight;
	/** What the browser shows now: the chat (true) or the waiting page (false); empty before the first load. */
	std::optional<bool> showing_chat;
};

std::string waiting_page()
{
	char *path = obs_module_file("waiting.html");
	std::string result = path ? path : "";
	bfree(path);
	return result;
}

/** Settings for the inner browser source. Caller holds the mutex. */
obs_data_t *browser_settings(const ChattoSource &source, bool chat)
{
	obs_data_t *settings = obs_data_create();
	obs_data_set_bool(settings, "is_local_file", !chat);
	if (chat)
		obs_data_set_string(settings, "url", embed_url(source.port, source.theme).c_str());
	else
		obs_data_set_string(settings, "local_file", waiting_page().c_str());
	obs_data_set_int(settings, "width", source.width);
	obs_data_set_int(settings, "height", source.height);
	obs_data_set_string(settings, "css", kTransparentCss);
	obs_data_set_bool(settings, "reroute_audio", false);
	obs_data_set_bool(settings, "shutdown", false);
	obs_data_set_bool(settings, "restart_when_active", false);
	// The page needs no access to OBS.
	obs_data_set_int(settings, "webpage_control_level", 0);
	return settings;
}

/** Points the browser at the chat or the waiting page. Caller holds the mutex. */
void show(ChattoSource &source, bool chat, bool force)
{
	if (!source.browser || (!force && source.showing_chat == chat))
		return;
	source.showing_chat = chat;
	obs_data_t *settings = browser_settings(source, chat);
	obs_source_update(source.browser, settings);
	obs_data_release(settings);
}

void read_settings(ChattoSource &source, obs_data_t *settings)
{
	source.theme = obs_data_get_string(settings, "theme");
	source.port = static_cast<int>(obs_data_get_int(settings, "port"));
	source.width = static_cast<int>(obs_data_get_int(settings, "width"));
	source.height = static_cast<int>(obs_data_get_int(settings, "height"));
}

// ---------- properties ----------

/** Fills the theme list from Chatto; returns whether Chatto answered. */
bool fill_themes(obs_property_t *list, const std::string &current, int port)
{
	obs_property_list_clear(list);
	obs_property_list_add_string(list, obs_module_text("Theme.Follow"), "");
	const auto themes = fetch_themes(port);
	bool has_current = current.empty();
	if (themes) {
		for (const auto &theme : *themes) {
			obs_property_list_add_string(list, theme.name.c_str(), theme.id.c_str());
			has_current = has_current || theme.id == current;
		}
	}
	// Keep a theme Chatto no longer lists (or cannot list now) selectable, so opening the dialog does not change it.
	if (!has_current)
		obs_property_list_add_string(list, current.c_str(), current.c_str());
	return themes.has_value();
}

void describe_status(obs_property_t *status, bool connected)
{
	obs_property_set_description(status, obs_module_text(connected ? "Status.Connected" : "Status.Waiting"));
	obs_property_text_set_info_type(status, connected ? OBS_TEXT_INFO_NORMAL : OBS_TEXT_INFO_WARNING);
}

bool refresh_clicked(obs_properties_t *props, obs_property_t *, void *data)
{
	auto *source = static_cast<ChattoSource *>(data);
	std::string theme;
	int port;
	{
		std::lock_guard lock(source->mutex);
		theme = source->theme;
		port = source->port;
	}
	const bool connected = fill_themes(obs_properties_get(props, "theme"), theme, port);
	describe_status(obs_properties_get(props, "status"), connected);
	return true;
}

obs_properties_t *get_properties(void *data)
{
	auto *source = static_cast<ChattoSource *>(data);
	std::string theme;
	int port = kDefaultPort;
	if (source) {
		std::lock_guard lock(source->mutex);
		theme = source->theme;
		port = source->port;
	}

	obs_properties_t *props = obs_properties_create();
	obs_property_t *status = obs_properties_add_text(props, "status", "", OBS_TEXT_INFO);
	obs_property_t *list = obs_properties_add_list(props, "theme", obs_module_text("Theme"), OBS_COMBO_TYPE_LIST,
						      OBS_COMBO_FORMAT_STRING);
	describe_status(status, fill_themes(list, theme, port));
	obs_properties_add_button(props, "refresh", obs_module_text("Theme.Refresh"), refresh_clicked);
	obs_properties_add_int(props, "width", obs_module_text("Width"), 100, 3840, 1);
	obs_properties_add_int(props, "height", obs_module_text("Height"), 100, 3840, 1);
	obs_property_t *port_field = obs_properties_add_int(props, "port", obs_module_text("Port"), 1024, 65535, 1);
	obs_property_set_long_description(port_field, obs_module_text("Port.Hint"));
	return props;
}

// ---------- lifecycle ----------

const char *get_name(void *)
{
	return obs_module_text("ChattoChat");
}

void get_defaults(obs_data_t *settings)
{
	obs_data_set_default_string(settings, "theme", "");
	obs_data_set_default_int(settings, "port", kDefaultPort);
	obs_data_set_default_int(settings, "width", kDefaultWidth);
	obs_data_set_default_int(settings, "height", kDefaultHeight);
}

void *create(obs_data_t *settings, obs_source_t *self)
{
	auto *source = new ChattoSource();
	source->self = self;
	read_settings(*source, settings);
	Watcher::instance().watch(source->port);

	std::lock_guard lock(source->mutex);
	const bool chat = Watcher::instance().connected(source->port);
	obs_data_t *browser = browser_settings(*source, chat);
	source->browser = obs_source_create_private("browser_source", "Chatto Chat (browser)", browser);
	obs_data_release(browser);
	if (source->browser)
		source->showing_chat = chat;
	else
		obs_log(LOG_WARNING, "obs-browser is not available; the Chatto source stays empty");
	return source;
}

void destroy(void *data)
{
	auto *source = static_cast<ChattoSource *>(data);
	Watcher::instance().unwatch(source->port);
	obs_source_release(source->browser);
	delete source;
}

void update(void *data, obs_data_t *settings)
{
	auto *source = static_cast<ChattoSource *>(data);
	std::lock_guard lock(source->mutex);
	const int old_port = source->port;
	read_settings(*source, settings);
	if (source->port != old_port) {
		Watcher::instance().watch(source->port);
		Watcher::instance().unwatch(old_port);
	}
	show(*source, Watcher::instance().connected(source->port), true);
}

/** Switches between the chat and the waiting page as Chatto starts and quits. */
void video_tick(void *data, float)
{
	auto *source = static_cast<ChattoSource *>(data);
	std::lock_guard lock(source->mutex);
	show(*source, Watcher::instance().connected(source->port), false);
}

void video_render(void *data, gs_effect_t *)
{
	auto *source = static_cast<ChattoSource *>(data);
	if (source->browser)
		obs_source_video_render(source->browser);
}

uint32_t get_width(void *data)
{
	auto *source = static_cast<ChattoSource *>(data);
	std::lock_guard lock(source->mutex);
	return static_cast<uint32_t>(source->width);
}

uint32_t get_height(void *data)
{
	auto *source = static_cast<ChattoSource *>(data);
	std::lock_guard lock(source->mutex);
	return static_cast<uint32_t>(source->height);
}

// The inner browser is private, so its visibility follows this source by hand.
void on_show(void *data)
{
	auto *source = static_cast<ChattoSource *>(data);
	if (source->browser)
		obs_source_inc_showing(source->browser);
}

void on_hide(void *data)
{
	auto *source = static_cast<ChattoSource *>(data);
	if (source->browser)
		obs_source_dec_showing(source->browser);
}

void on_activate(void *data)
{
	auto *source = static_cast<ChattoSource *>(data);
	if (source->browser)
		obs_source_inc_active(source->browser);
}

void on_deactivate(void *data)
{
	auto *source = static_cast<ChattoSource *>(data);
	if (source->browser)
		obs_source_dec_active(source->browser);
}

void enum_sources(void *data, obs_source_enum_proc_t callback, void *param)
{
	auto *source = static_cast<ChattoSource *>(data);
	if (source->browser)
		callback(source->self, source->browser, param);
}

} // namespace

void register_source()
{
	obs_source_info info = {};
	info.id = kSourceId;
	info.type = OBS_SOURCE_TYPE_INPUT;
	info.output_flags = OBS_SOURCE_VIDEO | OBS_SOURCE_CUSTOM_DRAW | OBS_SOURCE_DO_NOT_DUPLICATE | OBS_SOURCE_SRGB;
	info.icon_type = OBS_ICON_TYPE_BROWSER;
	info.get_name = get_name;
	info.create = create;
	info.destroy = destroy;
	info.update = update;
	info.get_defaults = get_defaults;
	info.get_properties = get_properties;
	info.get_width = get_width;
	info.get_height = get_height;
	info.video_tick = video_tick;
	info.video_render = video_render;
	info.show = on_show;
	info.hide = on_hide;
	info.activate = on_activate;
	info.deactivate = on_deactivate;
	info.enum_active_sources = enum_sources;
	info.enum_all_sources = enum_sources;
	obs_register_source(&info);
}

} // namespace chatto
