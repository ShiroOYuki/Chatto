// SPDX-License-Identifier: GPL-3.0-or-later
// One background thread that checks whether Chatto is running, for every port a source uses.
#pragma once

#include <condition_variable>
#include <map>
#include <mutex>
#include <thread>

namespace chatto {

class Watcher {
public:
	static Watcher &instance();

	void start();
	void stop();

	/** A source starts using this port; checked right away and then every few seconds. */
	void watch(int port);
	/** A source stops using this port. */
	void unwatch(int port);
	/** The last check's result: Chatto answered on this port. */
	bool connected(int port);

private:
	struct Entry {
		int users = 0;
		bool connected = false;
	};

	void run();

	std::mutex mutex_;
	std::condition_variable wake_;
	std::map<int, Entry> ports_;
	std::thread thread_;
	bool stopping_ = false;
	bool check_now_ = false;
};

} // namespace chatto
