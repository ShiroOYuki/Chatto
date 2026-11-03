// SPDX-License-Identifier: GPL-3.0-or-later
//
// obs-chatto: adds the "Chatto Chat" source to OBS Studio. The chat is
// Chatto's own embed page (served by the Chatto desktop app on 127.0.0.1),
// shown through a private obs-browser source.
#include <obs-module.h>
#include <plugin-support.h>

#include "chatto-source.hpp"
#include "chatto-watcher.hpp"

OBS_DECLARE_MODULE()
OBS_MODULE_USE_DEFAULT_LOCALE(PLUGIN_NAME, "en-US")

MODULE_EXPORT const char *obs_module_description(void)
{
	return obs_module_text("Description");
}

bool obs_module_load(void)
{
	chatto::register_source();
	chatto::Watcher::instance().start();
	obs_log(LOG_INFO, "loaded (version %s)", PLUGIN_VERSION);
	return true;
}

void obs_module_unload(void)
{
	chatto::Watcher::instance().stop();
}
