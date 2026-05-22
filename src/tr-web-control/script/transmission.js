// transmission RPC 操作类
var transmission = {
	SessionId: "",
	isInitialized: false,
	rpcVersion: 0,       // populated after session-get; used for version-aware API calls
	host: "",
	port: "9091",
	path: "/transmission/rpc",
	rpcpath: "../rpc",
	fullpath: "",
	on: {
		torrentCountChange: null,
		postError: null
	},
	username: "",
	password: "",
	// 种子状态
	_status: {
		stopped: 0,
		checkwait: 1,
		check: 2,
		downloadwait: 3,
		download: 4,
		seedwait: 5,
		seed: 6,
		// 自定义状态
		actively: 101
	},
	// TrackerStats' announceState
	_trackerStatus: {
		inactive: 0,
		waiting: 1,
		queued: 2,
		active: 3
	},
	options: {
		getFolders: true,
		getTarckers: true
	},
	headers: {},
	trackers: {},
	islocal: false,
	// The list of directories that currently exist
	downloadDirs: new Array(),

	getSessionId: function(me, callback) {
		var settings = {
			type: "POST",
			url: this.fullpath,
			error: function(request, event, settings) {
				var SessionId = "";
				if (request.status === 409 && (SessionId = request.getResponseHeader('X-Transmission-Session-Id'))) {
					me.isInitialized = true;
					me.SessionId = SessionId;
					me.headers["X-Transmission-Session-Id"] = SessionId;
					if (callback) {
						callback();
					}
				}
			},
			headers: this.headers
		};
		jQuery.ajax(settings);
	},

	init: function(config, callback) {
		jQuery.extend(this, config);
		if (this.username && this.password) {
			this.headers["Authorization"] = "Basic " + (new Base64()).encode(this.username + ":" + this.password);
		}
		this.fullpath = this.rpcpath;
		this.getSessionId(this, callback);
	},

	exec: function(config, callback, tags) {
		if (!this.isInitialized) {
			return false;
		}
		var data = {
			method: "",
			arguments: {},
			tag: ""
		};
		jQuery.extend(data, config);

		var settings = {
			type: "POST",
			url: this.fullpath,
			dataType: 'json',
			timeout: 15000,
			data: JSON.stringify(data),
			success: function(resultData, textStatus) {
				if (callback) {
					callback(resultData, tags);
				}
			},
			error: function(request, event, page) {
				var SessionId = "";
				if (request.status === 409 && (SessionId = request.getResponseHeader('X-Transmission-Session-Id'))) {
					transmission.SessionId = SessionId;
					transmission.headers["X-Transmission-Session-Id"] = SessionId;
					jQuery.ajax(settings);
				} else {
					if (transmission.on.postError) {
						transmission.on.postError(request);
					}
				}
			},
			headers: this.headers
		};
		jQuery.ajax(settings);
	},

	// ─── session normalization ────────────────────────────────────────────────
	// RPC v18 (Transmission 4.1+) switched all field names to snake_case.
	// To keep the rest of the codebase working unchanged, we remap the new
	// snake_case/underscore keys back to the hyphenated/camelCase forms that
	// system.js and other modules expect.
	_normalizeSessionData: function(data) {
		if (!data || typeof data !== 'object') return data;

		// session-get: hyphenated → snake_case remaps
		var sessionMap = {
			'rpc_version':                  'rpc-version',
			'rpc_version_minimum':          'rpc-version-minimum',
			'rpc_version_semver':           'rpc-version-semver',
			'version':                      'version', // unchanged
			'alt_speed_down':               'alt-speed-down',
			'alt_speed_enabled':            'alt-speed-enabled',
			'alt_speed_time_begin':         'alt-speed-time-begin',
			'alt_speed_time_day':           'alt-speed-time-day',
			'alt_speed_time_enabled':       'alt-speed-time-enabled',
			'alt_speed_time_end':           'alt-speed-time-end',
			'alt_speed_up':                 'alt-speed-up',
			'blocklist_enabled':            'blocklist-enabled',
			'blocklist_size':               'blocklist-size',
			'blocklist_url':                'blocklist-url',
			'cache_size_mb':                'cache-size-mb',   // v18 renames to cache_size_mib
			'cache_size_mib':               'cache-size-mb',   // normalise both to the old key
			'config_dir':                   'config-dir',
			'dht_enabled':                  'dht-enabled',
			'download_dir':                 'download-dir',
			'download_dir_free_space':      'download-dir-free-space',
			'download_queue_enabled':       'download-queue-enabled',
			'download_queue_size':          'download-queue-size',
			'encryption':                   'encryption',
			'idle_seeding_limit':           'idle-seeding-limit',
			'idle_seeding_limit_enabled':   'idle-seeding-limit-enabled',
			'incomplete_dir':               'incomplete-dir',
			'incomplete_dir_enabled':       'incomplete-dir-enabled',
			'lpd_enabled':                  'lpd-enabled',
			'peer_limit_global':            'peer-limit-global',
			'peer_limit_per_torrent':       'peer-limit-per-torrent',
			'peer_port':                    'peer-port',
			'peer_port_random_on_start':    'peer-port-random-on-start',
			'pex_enabled':                  'pex-enabled',
			'port_forwarding_enabled':      'port-forwarding-enabled',
			'queue_stalled_enabled':        'queue-stalled-enabled',
			'queue_stalled_minutes':        'queue-stalled-minutes',
			'rename_partial_files':         'rename-partial-files',
			'script_torrent_added_enabled':          'script-torrent-added-enabled',
			'script_torrent_added_filename':         'script-torrent-added-filename',
			'script_torrent_done_enabled':           'script-torrent-done-enabled',
			'script_torrent_done_filename':          'script-torrent-done-filename',
			'script_torrent_done_seeding_enabled':   'script-torrent-done-seeding-enabled',
			'script_torrent_done_seeding_filename':  'script-torrent-done-seeding-filename',
			'seed_queue_enabled':           'seed-queue-enabled',
			'seed_queue_size':              'seed-queue-size',
			'session_id':                   'session-id',
			'speed_limit_down':             'speed-limit-down',
			'speed_limit_down_enabled':     'speed-limit-down-enabled',
			'speed_limit_up':               'speed-limit-up',
			'speed_limit_up_enabled':       'speed-limit-up-enabled',
			'start_added_torrents':         'start-added-torrents',
			'trash_original_torrent_files': 'trash-original-torrent-files',
			'units':                        'units',
			'utp_enabled':                  'utp-enabled',
			'default_trackers':             'default-trackers',
			'tcp_enabled':                  'tcp-enabled',
			'sequential_download':          'sequential-download'
		};

		// If at least one known snake_case key is present, map everything
		var needsMapping = false;
		for (var snakeKey in sessionMap) {
			if (data.hasOwnProperty(snakeKey)) { needsMapping = true; break; }
		}
		if (!needsMapping) return data;

		for (var sk in sessionMap) {
			var hk = sessionMap[sk];
			if (data.hasOwnProperty(sk)) {
				if (!data.hasOwnProperty(hk)) {
					data[hk] = data[sk];
				}
			}
		}

		// Transmission 4.1+ (RPC v18) renamed the encryption value "tolerated" → "allowed".
		// Map it back so the UI dropdown (which uses "tolerated") still shows the right selection.
		if (data['encryption'] === 'allowed') {
			data['encryption'] = 'tolerated';
		}

		return data;
	},

	// session-stats: camelCase → snake_case remaps (v18+)
	_normalizeStatsData: function(data) {
		if (!data || typeof data !== 'object') return data;
		var map = {
			'torrent_count':        'torrentCount',
			'active_torrent_count': 'activeTorrentCount',
			'paused_torrent_count': 'pausedTorrentCount',
			'download_speed':       'downloadSpeed',
			'upload_speed':         'uploadSpeed'
		};
		for (var sk in map) {
			var ck = map[sk];
			if (data.hasOwnProperty(sk) && !data.hasOwnProperty(ck)) {
				data[ck] = data[sk];
			}
		}
		return data;
	},

	// ─── public API ──────────────────────────────────────────────────────────
	getStatus: function(callback) {
		this.exec({
			method: "session-stats"
		}, function(data) {
			if (data.result == "success") {
				var args = transmission._normalizeStatsData(data.arguments);
				if (callback) {
					callback(args);
				}
				if (transmission.torrents.count != args.torrentCount ||
					transmission.torrents.activeTorrentCount != args.activeTorrentCount ||
					transmission.torrents.pausedTorrentCount != args.pausedTorrentCount) {
					transmission.torrents.count = args.torrentCount;
					transmission.torrents.activeTorrentCount = args.activeTorrentCount;
					transmission.torrents.pausedTorrentCount = args.pausedTorrentCount;
					transmission._onTorrentCountChange();
				}
			}
		});
	},

	getSession: function(callback) {
		this.exec({
			method: "session-get"
		}, function(data) {
			if (data.result == "success") {
				var normalized = transmission._normalizeSessionData(data.arguments);
				// Track RPC version for version-aware calls
				var rv = normalized["rpc-version"] || normalized["rpc_version"] || 0;
				transmission.rpcVersion = parseInt(rv, 10) || 0;
				if (callback) {
					callback(normalized);
				}
			}
		});
	},

	// 添加种子
	addTorrentFromUrl: function(url, savepath, autostart, callback) {
		if (url.match(/^[0-9a-f]{40}$/i)) {
			url = 'magnet:?xt=urn:btih:' + url;
		}
		var options = {
			method: "torrent-add",
			arguments: {
				filename: url,
				paused: (!autostart)
			}
		};
		if (savepath) {
			options.arguments["download-dir"] = savepath;
		}
		this.exec(options, function(data) {
			switch (data.result) {
				case "success":
					if (callback) {
						// Support both camelCase (old) and snake_case (v18+) response keys
						var added = data.arguments["torrent-added"] || data.arguments["torrent_added"];
						var dupe  = data.arguments["torrent-duplicate"] || data.arguments["torrent_duplicate"];
						if (added) {
							callback(added);
						} else if (dupe) {
							callback({ status: "duplicate", torrent: dupe });
						}
					}
					break;
				case "duplicate torrent":
				default:
					if (callback) { callback(data.result); }
					break;
			}
		});
	},

	// 从文件内容增加种子
	addTorrentFromFile: function(file, savePath, paused, callback, filecount) {
		var fileReader = new FileReader();
		fileReader.onload = function(e) {
			var contents = e.target.result;
			var key = "base64,";
			var index = contents.indexOf(key);
			if (index == -1) { return; }
			var metainfo = contents.substring(index + key.length);

			transmission.exec({
				method: "torrent-add",
				arguments: {
					metainfo: metainfo,
					"download-dir": savePath,
					paused: paused
				}
			}, function(data) {
				switch (data.result) {
					case "success":
						if (callback) {
							var added = data.arguments["torrent-added"] || data.arguments["torrent_added"];
							var dupe  = data.arguments["torrent-duplicate"] || data.arguments["torrent_duplicate"];
							if (added != null)
								callback(added, filecount);
							else if (dupe != null)
								callback({ status: "duplicate", torrent: dupe }, filecount);
							else
								callback("error");
						}
						break;
					case "duplicate torrent":
						if (callback) { callback("duplicate"); }
						break;
				}
			});
		};
		fileReader.readAsDataURL(file);
	},

	_onTorrentCountChange: function() {
		this.torrents.loadSimpleInfo = false;
		if (this.on.torrentCountChange) {
			this.on.torrentCountChange();
		}
	},

	// ─── tracker management (version-aware) ──────────────────────────────────
	// Transmission 4.0+ (RPC v17) deprecated trackerAdd/trackerRemove/trackerReplace
	// in favour of the unified "trackerList" string field.

	// Add one or more tracker URLs to a single torrent.
	// urls: Array of tracker URL strings.
	addTrackers: function(torrentId, urls, callback) {
		var me = this;
		if (me.rpcVersion >= 17) {
			// Fetch current trackerList, append new URLs, then set.
			me.exec({
				method: "torrent-get",
				arguments: { fields: ["id", "trackerList"], ids: [torrentId] }
			}, function(data) {
				if (data.result !== "success") {
					if (callback) callback(false);
					return;
				}
				var torrent = data.arguments.torrents[0];
				var existing = torrent.trackerList || torrent.tracker_list || "";
				// Append new trackers (each on its own line, blank line as tier separator)
				var newList = existing.trim();
				for (var i = 0; i < urls.length; i++) {
					if (newList) newList += "\n";
					newList += urls[i];
				}
				me.exec({
					method: "torrent-set",
					arguments: { ids: [torrentId], trackerList: newList }
				}, function(d) {
					if (callback) callback(d.result === "success");
				});
			});
		} else {
			// Legacy: trackerAdd accepts an array of URLs
			me.exec({
				method: "torrent-set",
				arguments: { ids: torrentId, trackerAdd: urls }
			}, function(d) {
				if (callback) callback(d.result === "success");
			});
		}
	},

	// Remove a single tracker from a torrent identified by its announce URL.
	removeTracker: function(torrentId, trackerUrl, callback) {
		var me = this;
		if (me.rpcVersion >= 17) {
			me.exec({
				method: "torrent-get",
				arguments: { fields: ["id", "trackerList"], ids: [torrentId] }
			}, function(data) {
				if (data.result !== "success") {
					if (callback) callback(false);
					return;
				}
				var torrent = data.arguments.torrents[0];
				var existing = torrent.trackerList || torrent.tracker_list || "";
				var lines = existing.split("\n").filter(function(l) {
					return l.trim() !== trackerUrl.trim();
				});
				me.exec({
					method: "torrent-set",
					arguments: { ids: [torrentId], trackerList: lines.join("\n") }
				}, function(d) {
					if (callback) callback(d.result === "success");
				});
			});
		} else {
			// Legacy: need the numeric tracker id; look it up from trackerStats
			var torrent = me.torrents.all[torrentId];
			if (!torrent) { if (callback) callback(false); return; }
			var trackerStats = torrent.trackerStats || torrent.tracker_stats || [];
			var trackerId = null;
			for (var i = 0; i < trackerStats.length; i++) {
				if (trackerStats[i].announce === trackerUrl) {
					trackerId = trackerStats[i].id;
					break;
				}
			}
			if (trackerId === null) { if (callback) callback(false); return; }
			me.exec({
				method: "torrent-set",
				arguments: { ids: [torrentId], trackerRemove: [trackerId] }
			}, function(d) {
				if (callback) callback(d.result === "success");
			});
		}
	},

	// Replace oldUrl with newUrl across all torrents that have it.
	replaceTracker: function(torrentId, oldUrl, newUrl, callback) {
		var me = this;
		if (me.rpcVersion >= 17) {
			me.exec({
				method: "torrent-get",
				arguments: { fields: ["id", "trackerList"], ids: [torrentId] }
			}, function(data) {
				if (data.result !== "success") {
					if (callback) callback(false);
					return;
				}
				var torrent = data.arguments.torrents[0];
				var existing = torrent.trackerList || torrent.tracker_list || "";
				var updated = existing.split("\n").map(function(line) {
					return line.trim() === oldUrl.trim() ? newUrl : line;
				}).join("\n");
				me.exec({
					method: "torrent-set",
					arguments: { ids: [torrentId], trackerList: updated }
				}, function(d) {
					if (callback) callback(d.result === "success", torrentId);
				});
			});
		} else {
			// Legacy trackerReplace: [trackerId, newAnnounce]
			var torrent = me.torrents.all[torrentId];
			if (!torrent) { if (callback) callback(false); return; }
			var trackerStats = torrent.trackerStats || torrent.tracker_stats || [];
			var trackerId = null;
			for (var i = 0; i < trackerStats.length; i++) {
				if (trackerStats[i].announce === oldUrl) {
					trackerId = trackerStats[i].id;
					break;
				}
			}
			if (trackerId === null) { if (callback) callback(false); return; }
			me.exec({
				method: "torrent-set",
				arguments: { ids: [torrentId], trackerReplace: [trackerId, newUrl] }
			}, function(d) {
				if (callback) callback(d.result === "success", torrentId);
			});
		}
	},

	// ─── other methods ────────────────────────────────────────────────────────
	removeTorrent: function(ids, removeData, callback) {
		this.exec({
			method: "torrent-remove",
			arguments: {
				ids: ids,
				"delete-local-data": removeData
			}
		}, function(data) {
			if (callback) callback(data.result);
		});
	},

	getFreeSpace: function(path, callback) {
		this.exec({
			method: "free-space",
			arguments: { "path": path }
		}, function(result) {
			if (callback) callback(result);
		});
	},

	updateBlocklist: function(callback) {
		this.exec({ method: "blocklist-update" }, function(data) {
			if (callback) callback(data.result);
		});
	},

	renameTorrent: function(torrentId, oldpath, newname, callback) {
		var torrent = this.torrents.all[torrentId];
		if (!torrent) return false;
		this.exec({
			method: "torrent-rename-path",
			arguments: {
				ids: [torrentId],
				path: oldpath || torrent.name,
				name: newname
			}
		}, function(data) {
			if (callback) callback(data);
		});
	},

	closeSession: function(callback) {
		this.exec({ method: "session-close" }, function(result) {
			if (callback) callback(result);
		});
	}
};
