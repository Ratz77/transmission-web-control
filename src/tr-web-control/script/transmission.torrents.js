// Torrent related information
transmission.torrents = {
	all: null,
	puased: null,
	downloading: null,
	actively: null,
	searchResult: null,
	error: null,
	warning: null,
	folders: {},
	status: {},
	count: 0,
	totalSize: 0,
	loadSimpleInfo: false,
	activeTorrentCount: 0,
	pausedTorrentCount: 0,
	fields: {
		// We request both camelCase (RPC ≤v17) and snake_case (RPC v18+) names.
		// Unknown field names are silently ignored by the server, so this is safe
		// across all Transmission versions.
		base: [
			// camelCase / hyphenated — Transmission ≤4.0 (RPC ≤v17)
			"id","name","status","hashString","totalSize","percentDone","addedDate",
			"trackerStats","leftUntilDone","rateDownload","rateUpload","recheckProgress",
			"peersGettingFromUs","peersSendingToUs","uploadRatio","uploadedEver",
			"downloadedEver","downloadDir","error","errorString","doneDate",
			"queuePosition","activityDate","labels","trackerList","percentComplete","file-count",
			// snake_case equivalents — Transmission 4.1+ (RPC v18); ignored by older versions
			"hash_string","total_size","percent_done","added_date","tracker_stats",
			"left_until_done","rate_download","rate_upload","recheck_progress",
			"peers_getting_from_us","peers_sending_to_us","upload_ratio","uploaded_ever",
			"downloaded_ever","download_dir","error_string","done_date",
			"queue_position","activity_date","tracker_list","percent_complete","file_count"
		].join(","),
		status: [
			// camelCase (RPC ≤v17)
			"id","name","status","totalSize","percentDone","trackerStats","leftUntilDone",
			"rateDownload","rateUpload","recheckProgress","peersGettingFromUs",
			"peersSendingToUs","uploadRatio","uploadedEver","downloadedEver","error",
			"errorString","doneDate","queuePosition","activityDate","labels",
			// snake_case (RPC v18+)
			"total_size","percent_done","tracker_stats","left_until_done","rate_download",
			"rate_upload","recheck_progress","peers_getting_from_us","peers_sending_to_us",
			"upload_ratio","uploaded_ever","downloaded_ever","error_string","done_date",
			"queue_position","activity_date"
		].join(","),
		config: [
			// camelCase (RPC ≤v17)
			"id","name","downloadLimit","downloadLimited","peer-limit",
			"seedIdleLimit","seedIdleMode","seedRatioLimit","seedRatioMode",
			"uploadLimit","uploadLimited",
			// snake_case (RPC v18+)
			"download_limit","download_limited","peer_limit",
			"seed_idle_limit","seed_idle_mode","seed_ratio_limit","seed_ratio_mode",
			"upload_limit","upload_limited"
		].join(",")
	},
	// List of all the torrents that have been acquired
	datas: {},
	// The list of recently acquired torrents
	recently: null,
	// The recently removed seed
	removed: null,
	// Whether the torrents are being changed
	isRecentlyActive: false,
	// New torrents
	newIds: new Array(),
	btItems: [],

	// ─── normalization helpers ────────────────────────────────────────────────
	// RPC v18 (Transmission 4.1+) renamed all torrent fields to snake_case.
	// These helpers add the camelCase aliases that the rest of the code expects,
	// without removing the original snake_case keys.
	_normalizeTrackerStat: function(s) {
		if (!s) return s;
		// Map snake_case → camelCase for each trackerStat field
		var map = {
			last_announce_result:    'lastAnnounceResult',
			last_announce_succeeded: 'lastAnnounceSucceeded',
			announce_state:          'announceState',
			leecher_count:           'leecherCount',
			seeder_count:            'seederCount',
			next_announce_time:      'nextAnnounceTime',
			last_announce_time:      'lastAnnounceTime',
			last_scrape_result:      'lastScrapeResult',
			last_scrape_succeeded:   'lastScrapeSucceeded',
			last_scrape_time:        'lastScrapeTime',
			next_scrape_time:        'nextScrapeTime',
			scrape_state:            'scrapeState',
			has_announced:           'hasAnnounced',
			has_scraped:             'hasScraped',
			is_backup:               'isBackup',
			downloader_count:        'downloaderCount'
		};
		for (var sk in map) {
			var ck = map[sk];
			if (s.hasOwnProperty(sk) && !s.hasOwnProperty(ck)) {
				s[ck] = s[sk];
			}
		}
		// Ensure lastAnnounceResult is at least an empty string to avoid .toLowerCase() crashes
		if (s.lastAnnounceResult === undefined || s.lastAnnounceResult === null) {
			s.lastAnnounceResult = "";
		}
		return s;
	},

	_normalizeTorrent: function(item) {
		if (!item) return item;
		var map = {
			hash_string:          'hashString',
			total_size:           'totalSize',
			percent_done:         'percentDone',
			percent_complete:     'percentComplete',
			added_date:           'addedDate',
			tracker_stats:        'trackerStats',
			tracker_list:         'trackerList',
			left_until_done:      'leftUntilDone',
			rate_download:        'rateDownload',
			rate_upload:          'rateUpload',
			recheck_progress:     'recheckProgress',
			peers_getting_from_us:'peersGettingFromUs',
			peers_sending_to_us:  'peersSendingToUs',
			upload_ratio:         'uploadRatio',
			uploaded_ever:        'uploadedEver',
			downloaded_ever:      'downloadedEver',
			download_dir:         'downloadDir',
			error_string:         'errorString',
			done_date:            'doneDate',
			queue_position:       'queuePosition',
			activity_date:        'activityDate',
			magnet_link:          'magnetLink',
			file_stats:           'fileStats',
			file_count:           'fileCount',
			sequential_download:  'sequentialDownload',
			primary_mime_type:    'primaryMimeType',
			download_limit:       'downloadLimit',
			download_limited:     'downloadLimited',
			peer_limit:           'peer-limit',
			seed_idle_limit:      'seedIdleLimit',
			seed_idle_mode:       'seedIdleMode',
			seed_ratio_limit:     'seedRatioLimit',
			seed_ratio_mode:      'seedRatioMode',
			upload_limit:         'uploadLimit',
			upload_limited:       'uploadLimited',
			piece_count:          'pieceCount',
			piece_size:           'pieceSize',
			date_created:         'dateCreated'
		};
		for (var sk in map) {
			var ck = map[sk];
			if (item.hasOwnProperty(sk) && !item.hasOwnProperty(ck)) {
				item[ck] = item[sk];
			}
		}
		// Normalise nested trackerStats array
		if (item.trackerStats && Array.isArray(item.trackerStats)) {
			for (var i = 0; i < item.trackerStats.length; i++) {
				transmission.torrents._normalizeTrackerStat(item.trackerStats[i]);
			}
		}
		return item;
	},

	// ─── data retrieval ───────────────────────────────────────────────────────
	getallids: function(callback, ids, moreFields) {
		var tmp = this.fields.base;
		if (this.loadSimpleInfo && this.all)
			tmp = this.fields.status;

		var fields = tmp.split(",");
		if ($.isArray(moreFields)) {
			$.unique($.merge(fields, moreFields));
		}
		var args = { fields: fields };

		this.isRecentlyActive = false;
		if (this.all && ids == undefined) {
			args["ids"] = "recently-active";
			this.isRecentlyActive = true;
		} else if (ids) {
			args["ids"] = ids;
		}
		if (!this.all) {
			this.all = {};
		}
		transmission.exec({
			method: "torrent-get",
			arguments: args
		}, function(data) {
			if (data.result == "success") {
				// Normalise every torrent object before processing
				var torrents = data.arguments.torrents || [];
				for (var i = 0; i < torrents.length; i++) {
					transmission.torrents._normalizeTorrent(torrents[i]);
				}
				transmission.torrents.newIds.length = 0;
				transmission.torrents.loadSimpleInfo = true;
				transmission.torrents.recently = torrents;
				transmission.torrents.removed = data.arguments.removed;
				transmission.torrents.splitid();
				if (callback) {
					callback(torrents);
				}
			} else {
				transmission.torrents.datas = null;
				if (callback) {
					callback(null);
				}
			}
		});
	},

	// The IDs are sorted according to the torrent status
	splitid: function() {
		this.downloading = new Array();
		this.puased = new Array();
		this.actively = new Array();
		this.error = new Array();
		this.warning = new Array();
		this.btItems = new Array();
		if (transmission.downloadDirs == undefined) {
			transmission.downloadDirs = new Array();
		}

		var _Status = transmission._status;
		this.status = {};
		transmission.trackers = {};
		this.totalSize = 0;
		this.folders = {};
		this.count = 0;

		var B64 = new Base64();

		for (var index in this.recently) {
			var item = this.recently[index];
			this.datas[item.id] = item;
		}

		var removed = new Array();
		for (var index in this.removed) {
			var item = this.removed[index];
			removed.push(item);
		}

		for (var index in this.datas) {
			var item = this.datas[index];
			if (!item) { return; }
			if ($.inArray(item.id, removed) != -1 && removed.length > 0) {
				if (this.all[item.id]) {
					this.all[item.id] = null;
					delete this.all[item.id];
				}
				this.datas[index] = null;
				delete this.datas[index];
				continue;
			}
			if (this.isRecentlyActive && !this.all[item.id]) {
				this.newIds.push(item.id);
			}
			item = $.extend(this.all[item.id], item);
			if (item.uploadedEver == 0 && item.downloadedEver == 0) {
				item.uploadRatio = -1;
			}
			item.uploadRatio = parseFloat(item.uploadRatio);
			item.infoIsLoading = false;
			var type = this.status[item.status];
			this.addTracker(item);
			if (!type) {
				this.status[item.status] = new Array();
				type = this.status[item.status];
			}

			this.totalSize += item.totalSize;

			if (item.rateDownload > 0 && item.leftUntilDone > 0) {
				item["remainingTime"] = Math.floor(item.leftUntilDone / item.rateDownload * 1000);
			} else if (item.rateDownload == 0 && item.leftUntilDone == 0 && item.totalSize != 0) {
				item["remainingTime"] = 0;
			} else {
				item["remainingTime"] = 3153600000000; // ~100 years
			}

			type.push(item);
			if (item.error != 0) {
				this.error.push(item);
			}
			if (item.rateUpload > 0 || item.rateDownload > 0) {
				this.actively.push(item);
			}

			switch (item.status) {
				case _Status.stopped:
					this.puased.push(item);
					break;
				case _Status.download:
					this.downloading.push(item);
					break;
			}

			this.all[item.id] = item;

			if ($.inArray(item.downloadDir, transmission.downloadDirs) == -1) {
				transmission.downloadDirs.push(item.downloadDir);
			}

			if (transmission.options.getFolders) {
				if (item.downloadDir) {
					var folder = item.downloadDir.replace(/\\/g, "/").split("/");
					var folderkey = "folders-";
					for (var i in folder) {
						var text = folder[i];
						if (text == "") { continue; }
						var key = B64.encode(text);
						folderkey += key.replace(/[+|\/|=]/g, "0");
						var node = this.folders[folderkey];
						if (!node) {
							node = { count: 0, torrents: new Array(), size: 0, nodeid: folderkey };
						}
						node.torrents.push(item);
						node.count++;
						node.size += item.totalSize;
						this.folders[folderkey] = node;
					}
				}
			}
			this.count++;
		}
		transmission.downloadDirs = transmission.downloadDirs.sort();

		if (this.newIds.length > 0) {
			this.getallids(null, this.newIds);
		}
	},

	addTracker: function(item) {
		var trackerStats = item.trackerStats;
		var trackers = [];

		item.leecherCount = 0;
		item.seederCount = 0;

		if (!trackerStats || trackerStats.length === 0) return;

		var warnings = [];
		var trackerInfo; // used after loop for nextAnnounceTime
		for (var index in trackerStats) {
			trackerInfo = trackerStats[index];
			// Ensure sub-fields are normalised (in case this item came from a
			// partial update path that bypassed getallids normalisation)
			transmission.torrents._normalizeTrackerStat(trackerInfo);

			var lastResult = (trackerInfo.lastAnnounceResult || "").toLowerCase();
			var hostName = (trackerInfo.host || "").getHostName();
			var trackerUrl = hostName.split(".");
			if ($.inArray(trackerUrl[0], "www,tracker,announce".split(",")) != -1) {
				trackerUrl.shift();
			}
			var name = trackerUrl.join(".");
			var id = "tracker-" + name.replace(/\./g, "-");
			var tracker = transmission.trackers[id];
			if (!tracker) {
				transmission.trackers[id] = {
					count: 0,
					torrents: new Array(),
					size: 0,
					connected: true,
					isBT: (trackerStats.length > 5)
				};
				tracker = transmission.trackers[id];
			}
			tracker["name"] = name;
			tracker["nodeid"] = id;
			tracker["host"] = trackerInfo.host;

			if (!trackerInfo.lastAnnounceSucceeded && trackerInfo.announceState != transmission._trackerStatus.inactive) {
				warnings.push(trackerInfo.lastAnnounceResult || "");
				if (lastResult == "could not connect to tracker") {
					tracker.connected = false;
				}
			}
			if (tracker.torrents.indexOf(item) == -1) {
				tracker.torrents.push(item);
				tracker.count++;
				tracker.size += item.totalSize;
			}
			item.leecherCount += (trackerInfo.leecherCount || 0);
			item.seederCount  += (trackerInfo.seederCount  || 0);
			if (trackers.indexOf(name) == -1) {
				trackers.push(name);
			}
		}

		if (trackerStats.length > 5) {
			this.btItems.push(item);
		}

		if (warnings.length == trackerStats.length) {
			if ((warnings.join(";")).replace(/;/g, "") == "") {
				item["warning"] = "";
			} else {
				item["warning"] = warnings.join(";");
			}
			if (trackerInfo) {
				if (!item["nextAnnounceTime"])
					item["nextAnnounceTime"] = trackerInfo.nextAnnounceTime;
				else if (item["nextAnnounceTime"] > trackerInfo.nextAnnounceTime)
					item["nextAnnounceTime"] = trackerInfo.nextAnnounceTime;
			}
			this.warning.push(item);
		}

		if (item.leecherCount < 0) item.leecherCount = 0;
		if (item.seederCount < 0)  item.seederCount  = 0;

		item.leecher  = item.leecherCount + " (" + item.peersGettingFromUs + ")";
		item.seeder   = item.seederCount  + " (" + item.peersSendingToUs   + ")";
		item.trackers = trackers.join(";");
	},

	getPeers: function(ids) {
		transmission.exec({
			method: "torrent-get",
			arguments: {
				fields: ("peers,peersFrom").split(","),
				ids: ids
			}
		}, function(data) {
			console.log("data:", data);
		});
	},

	getMoreInfos: function(fields, ids, callback) {
		transmission.exec({
			method: "torrent-get",
			arguments: { fields: fields.split(","), ids: ids }
		}, function(data) {
			if (data.result == "success") {
				var torrents = data.arguments.torrents || [];
				for (var i = 0; i < torrents.length; i++) {
					transmission.torrents._normalizeTorrent(torrents[i]);
				}
				if (callback) callback(torrents);
			} else if (callback) {
				callback(null);
			}
		});
	},

	search: function(key, source) {
		if (!key) { return null; }
		if (!source) { source = this.all; }
		var arrReturn = new Array();
		$.each(source, function(item, i) {
			if (source[item].name.toLowerCase().indexOf(key.toLowerCase()) != -1) {
				arrReturn.push(source[item]);
			}
		});
		this.searchResult = arrReturn;
		return arrReturn;
	},

	getFiles: function(id, callback) {
		// Request both old and new field names for compatibility
		transmission.exec({
			method: "torrent-get",
			arguments: {
				fields: ["files", "fileStats", "file_stats"],
				ids: id
			}
		}, function(data) {
			if (data.result == "success") {
				var torrents = data.arguments.torrents || [];
				for (var i = 0; i < torrents.length; i++) {
					transmission.torrents._normalizeTorrent(torrents[i]);
				}
				if (callback) callback(torrents);
			} else if (callback) {
				callback(null);
			}
		});
	},

	getConfig: function(id, callback) {
		this.getMoreInfos(this.fields.config, id, callback);
	},

	getErrorIds: function(ignore, needUpdateOnly) {
		var result = new Array();
		var now = new Date();
		if (needUpdateOnly == true) {
			now = now.getTime() / 1000;
		}
		for (var index in this.error) {
			var item = this.error[index];
			if ($.inArray(item.id, ignore) != -1 && ignore.length > 0) { continue; }
			if (needUpdateOnly == true && now < item.nextAnnounceTime) { continue; }
			if (item.status == transmission._status.stopped) { continue; }
			result.push(item.id);
		}
		for (var index in this.warning) {
			var item = this.warning[index];
			if ($.inArray(item.id, ignore) != -1 && ignore.length > 0) { continue; }
			if (needUpdateOnly == true && now < item.nextAnnounceTime) { continue; }
			result.push(item.id);
		}
		return result;
	},

	// Replace a tracker URL across ALL torrents that have it.
	// Uses transmission.replaceTracker() which is version-aware (v17+ uses trackerList).
	searchAndReplaceTrackers: function(oldTracker, newTracker, callback) {
		if (!oldTracker || !newTracker) { return; }

		// Collect torrent IDs that have oldTracker
		var idsToUpdate = [];
		for (var index in this.all) {
			var item = this.all[index];
			if (!item) { continue; }
			var trackerStats = item.trackerStats || [];
			for (var n in trackerStats) {
				if (trackerStats[n].announce === oldTracker) {
					if (idsToUpdate.indexOf(item.id) === -1) {
						idsToUpdate.push(item.id);
					}
					break;
				}
			}
		}

		var count = idsToUpdate.length;
		if (count === 0) {
			if (callback) { callback(null, 0); }
			return;
		}

		var completed = 0;
		var allOk = true;
		var updatedIds = [];
		for (var i = 0; i < idsToUpdate.length; i++) {
			(function(torrentId) {
				transmission.replaceTracker(torrentId, oldTracker, newTracker, function(ok) {
					completed++;
					if (ok) { updatedIds.push(torrentId); }
					else { allOk = false; }
					if (completed === count) {
						if (callback) {
							callback(allOk ? updatedIds : null, count);
						}
					}
				});
			})(idsToUpdate[i]);
		}
	},

	// 获取磁力链接
	getMagnetLink: function(ids, callback) {
		var result = "";
		if (ids.constructor.name != "Array") ids = [ids];
		if (ids.length == 0) {
			if (callback) callback(result);
			return;
		}
		var req_list = [];
		for (var id in ids) {
			id = ids[id];
			if (!this.all[id]) continue;
			if (!this.all[id].magnetLink)
				req_list.push(id);
			else
				result += this.all[id].magnetLink + "\n";
		}
		if (req_list.length == 0) {
			if (callback) callback(result.trim());
			return;
		}
		transmission.exec({
			method: "torrent-get",
			arguments: {
				fields: ["id", "magnetLink"],
				ids: req_list
			}
		}, function(data) {
			if (data.result == "success") {
				for (var item in data.arguments.torrents) {
					item = data.arguments.torrents[item];
					transmission.torrents._normalizeTorrent(item);
					transmission.torrents.all[item.id].magnetLink = item.magnetLink;
					result += item.magnetLink + "\n";
				}
				if (callback) callback(result.trim());
			}
		});
	}
};
