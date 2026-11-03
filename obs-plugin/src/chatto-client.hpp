// SPDX-License-Identifier: GPL-3.0-or-later
// Talks to the Chatto desktop app's local server (127.0.0.1 only).
#pragma once

#include <optional>
#include <string>
#include <vector>

namespace chatto {

inline constexpr int kDefaultPort = 4820;

struct ThemeSummary {
	std::string id;
	std::string name;
};

/** Whether Chatto answers on this port: `/api/ping` must say it is Chatto, not another app. */
bool ping(int port);

/** Chatto's themes (id and name in its interface language), or nothing when it is not reachable. */
std::optional<std::vector<ThemeSummary>> fetch_themes(int port);

/** The embed page for an OBS source; an empty theme follows the OBS theme chosen in Chatto. */
std::string embed_url(int port, const std::string &theme_id);

} // namespace chatto
