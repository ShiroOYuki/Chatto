// SPDX-License-Identifier: GPL-3.0-or-later
#include "chatto-watcher.hpp"

#include "chatto-client.hpp"

#include <obs-module.h>
#include <plugin-support.h>

#include <chrono>
#include <utility>
#include <vector>

namespace chatto {
namespace {
constexpr auto kInterval = std::chrono::seconds(3);
}

Watcher &Watcher::instance()
{
	static Watcher watcher;
	return watcher;
}

void Watcher::start()
{
	std::lock_guard lock(mutex_);
	if (thread_.joinable())
		return;
	stopping_ = false;
	thread_ = std::thread([this] { run(); });
}

void Watcher::stop()
{
	{
		std::lock_guard lock(mutex_);
		stopping_ = true;
	}
	wake_.notify_all();
	if (thread_.joinable())
		thread_.join();
}

void Watcher::watch(int port)
{
	{
		std::lock_guard lock(mutex_);
		if (ports_[port].users++ == 0)
			check_now_ = true;
	}
	wake_.notify_all();
}

void Watcher::unwatch(int port)
{
	std::lock_guard lock(mutex_);
	auto entry = ports_.find(port);
	if (entry != ports_.end() && --entry->second.users <= 0)
		ports_.erase(entry);
}

bool Watcher::connected(int port)
{
	std::lock_guard lock(mutex_);
	auto entry = ports_.find(port);
	return entry != ports_.end() && entry->second.connected;
}

void Watcher::run()
{
	std::unique_lock lock(mutex_);
	while (!stopping_) {
		std::vector<int> ports;
		for (const auto &[port, entry] : ports_)
			ports.push_back(port);

		// Checks run unlocked: a slow answer must not block the graphics thread asking connected().
		lock.unlock();
		std::vector<std::pair<int, bool>> results;
		for (const int port : ports)
			results.emplace_back(port, ping(port));
		lock.lock();

		for (const auto &[port, up] : results) {
			auto entry = ports_.find(port);
			if (entry == ports_.end() || entry->second.connected == up)
				continue;
			entry->second.connected = up;
			obs_log(LOG_INFO, up ? "Chatto found on port %d" : "Chatto is gone from port %d", port);
		}

		wake_.wait_for(lock, kInterval, [this] { return stopping_ || check_now_; });
		check_now_ = false;
	}
}

} // namespace chatto
