// SPDX-License-Identifier: GPL-3.0-or-later
#include "chatto-client.hpp"

#include <obs-module.h>

#include <windows.h>
#include <winhttp.h>

#include <cstring>
#include <memory>

namespace chatto {
namespace {

/** Short timeouts: Chatto is on the same machine, and the properties dialog waits for the answer. */
constexpr int kTimeoutMs = 800;
/** Answers are a few KB; anything larger is not Chatto. */
constexpr size_t kMaxBody = 256 * 1024;

struct HandleCloser {
	void operator()(HINTERNET handle) const { WinHttpCloseHandle(handle); }
};
using Handle = std::unique_ptr<void, HandleCloser>;

struct DataReleaser {
	void operator()(obs_data_t *data) const { obs_data_release(data); }
};
using Data = std::unique_ptr<obs_data_t, DataReleaser>;

/** GET http://127.0.0.1:<port><path>; the body on HTTP 200, nothing otherwise. */
std::optional<std::string> http_get(int port, const wchar_t *path)
{
	if (port <= 0 || port > 65535)
		return std::nullopt;
	Handle session(WinHttpOpen(L"obs-chatto", WINHTTP_ACCESS_TYPE_NO_PROXY, WINHTTP_NO_PROXY_NAME,
				   WINHTTP_NO_PROXY_BYPASS, 0));
	if (!session)
		return std::nullopt;
	WinHttpSetTimeouts(session.get(), kTimeoutMs, kTimeoutMs, kTimeoutMs, kTimeoutMs);
	Handle connection(WinHttpConnect(session.get(), L"127.0.0.1", static_cast<INTERNET_PORT>(port), 0));
	if (!connection)
		return std::nullopt;
	Handle request(WinHttpOpenRequest(connection.get(), L"GET", path, nullptr, WINHTTP_NO_REFERER,
					  WINHTTP_DEFAULT_ACCEPT_TYPES, 0));
	if (!request)
		return std::nullopt;
	if (!WinHttpSendRequest(request.get(), WINHTTP_NO_ADDITIONAL_HEADERS, 0, WINHTTP_NO_REQUEST_DATA, 0, 0, 0) ||
	    !WinHttpReceiveResponse(request.get(), nullptr))
		return std::nullopt;

	DWORD status = 0;
	DWORD size = sizeof(status);
	if (!WinHttpQueryHeaders(request.get(), WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER,
				 WINHTTP_HEADER_NAME_BY_INDEX, &status, &size, WINHTTP_NO_HEADER_INDEX) ||
	    status != 200)
		return std::nullopt;

	std::string body;
	for (;;) {
		DWORD available = 0;
		if (!WinHttpQueryDataAvailable(request.get(), &available))
			return std::nullopt;
		if (available == 0)
			break;
		if (body.size() + available > kMaxBody)
			return std::nullopt;
		const size_t offset = body.size();
		body.resize(offset + available);
		DWORD read = 0;
		if (!WinHttpReadData(request.get(), body.data() + offset, available, &read))
			return std::nullopt;
		body.resize(offset + read);
	}
	return body;
}

/** Percent-encodes everything but unreserved characters (RFC 3986). */
std::string encode_component(const std::string &value)
{
	static const char *hex = "0123456789ABCDEF";
	std::string out;
	for (const unsigned char c : value) {
		if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-' || c == '_' ||
		    c == '.' || c == '~') {
			out += static_cast<char>(c);
		} else {
			out += '%';
			out += hex[c >> 4];
			out += hex[c & 0xF];
		}
	}
	return out;
}

} // namespace

bool ping(int port)
{
	const auto body = http_get(port, L"/api/ping");
	if (!body)
		return false;
	Data data(obs_data_create_from_json(body->c_str()));
	return data && strcmp(obs_data_get_string(data.get(), "app"), "chatto") == 0;
}

std::optional<std::vector<ThemeSummary>> fetch_themes(int port)
{
	const auto body = http_get(port, L"/api/themes");
	if (!body)
		return std::nullopt;
	// obs_data only parses JSON objects, so the array is wrapped in one.
	Data data(obs_data_create_from_json(("{\"themes\":" + *body + "}").c_str()));
	if (!data)
		return std::nullopt;
	obs_data_array_t *array = obs_data_get_array(data.get(), "themes");
	if (!array)
		return std::nullopt;
	std::vector<ThemeSummary> themes;
	const size_t count = obs_data_array_count(array);
	for (size_t i = 0; i < count; i++) {
		Data item(obs_data_array_item(array, i));
		const char *id = obs_data_get_string(item.get(), "id");
		const char *name = obs_data_get_string(item.get(), "name");
		if (*id)
			themes.push_back({id, *name ? name : id});
	}
	obs_data_array_release(array);
	return themes;
}

std::string embed_url(int port, const std::string &theme_id)
{
	std::string url = "http://127.0.0.1:" + std::to_string(port) + "/embed";
	if (!theme_id.empty())
		url += "?theme=" + encode_component(theme_id);
	return url;
}

} // namespace chatto
