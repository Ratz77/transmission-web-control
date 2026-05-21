#!/bin/bash
# Transmission Web Control – installation script
# Fork: maintained at https://github.com/Ratz77/transmission-web-control
ARG1="$1"
ROOT_FOLDER=""
SCRIPT_NAME="$0"
SCRIPT_VERSION="1.3.0-fork"
VERSION=""
# HTML_FOLDER_NAME is detected at runtime (web = Tr ≤3.x, public_html = Tr ≥4.0)
HTML_FOLDER_NAME=""
WEB_FOLDER=""
ORG_INDEX_FILE="index.original.html"
INDEX_FILE="index.html"
TMP_FOLDER="/tmp/tr-web-control"
PACK_NAME="master.tar.gz"
WEB_HOST="https://github.com/Ratz77/transmission-web-control/archive/"
LAST_RELEASES="https://api.github.com/repos/Ratz77/transmission-web-control/releases/latest"
DOWNLOAD_URL="$WEB_HOST$PACK_NAME"
# 安装类型
INSTALL_TYPE=-1
SKIP_SEARCH=0
AUTOINSTALL=0
if which whoami 2>/dev/null; then
	USER=$(whoami)
fi

#==========================================================
MSG_TR_WORK_FOLDER="Transmission Web Path: "
MSG_SPECIFIED_VERSION="You are using the specified version to install, version:"
MSG_SEARCHING_TR_FOLDER="Searching Transmission Web Folder..."
MSG_THE_SPECIFIED_DIRECTORY_DOES_NOT_EXIST="Folder not found. Will search the entire /. This will take a while..."
MSG_USE_WEB_HOME="Use TRANSMISSION_WEB_HOME Variable: $TRANSMISSION_WEB_HOME"
MSG_AVAILABLE="Available"
MSG_TRY_SPECIFIED_VERSION="Attempting to specify version: "
MSG_PACK_COPYING="Copying installation package..."
MSG_WEB_PATH_IS_MISSING="ERROR : Transmisson WEB UI Folder is missing, Please confirm Transmisson is installed."
MSG_PACK_IS_EXIST=" Already exist, whether to download again? (y/n)"
MSG_SIKP_DOWNLOAD="\nSkip download, preparing to install"
MSG_DOWNLOADING="Transmission Web Control Is Downloading..."
MSG_DOWNLOAD_COMPLETE="Download completed, ready to install..."
MSG_DOWNLOAD_FAILED="The installation package failed to download. Please try again or try another version."
MSG_INSTALL_COMPLETE="Transmission Web Control Installation Completed!"
MSG_PACK_EXTRACTING="Extracting installation package..."
MSG_PACK_CLEANING_UP="Cleaning up the installation package..."
MSG_DONE="Installation completed. See: https://github.com/Ratz77/transmission-web-control/wiki"
MSG_SETTING_PERMISSIONS="Setting permissions..."
MSG_BEGIN="BEGIN"
MSG_END="END"
MSG_WGET_NOT_FIND="Could not find curl or wget, please install one."
MSG_DETECTED_HTML_FOLDER="Detected web UI folder name: "
MSG_MAIN_MENU="
	Welcome to the Transmission Web Control Installation Script (fork).
	Installation script version: $SCRIPT_VERSION

	1. Install the latest release.
	2. Install the specified version.
	3. Revert to the official UI.
	4. Re-download the installation script.
	5. Check if Transmission is started.
	6. Input the Transmission Web directory.
	9. Installing from 'master' Repository.
	===================
	0. Exit the installation;

	Please enter the corresponding number: "
MSG_INPUT_VERSION="Please enter the version number (e.g: 1.5.1):"
MSG_INPUT_TR_FOLDER="Please enter the directory where Transmission is located (without 'web'/'public_html', e.g /usr/share/transmission): "
MSG_SPECIFIED_FOLDER="The installation directory is specified as: "
MSG_INVALID_PATH="The input path is invalid."
MSG_MASTER_INSTALL_CONFIRM="Do you confirm the installation? (y/n): "
MSG_FIND_WEB_FOLDER_FROM_PROCESS="Attempting to identify transmission Web directory from process..."
MSG_FIND_WEB_FOLDER_FROM_PROCESS_FAILED=" × Recognition failed, please confirm that transmission has started."
MSG_CHECK_TR_DAEMON="Detecting the Transmission process..."
MSG_CHECK_TR_DAEMON_FAILED="No Transmission was found in the system process. Please confirm that it is started."
MSG_TRY_START_TR="Do you want to try to start transmission-daemon? (y/n) "
MSG_TR_DAEMON_IS_STARTED="Transmission Is Started."
MSG_REVERTING_ORIGINAL_UI="Restoring the official UI..."
MSG_REVERT_COMPLETE="Restore complete, please re-enter http://ip:9091/ or refresh in the browser to view the official UI."
MSG_ORIGINAL_UI_IS_MISSING="The official UI does not exist."
MSG_DOWNLOADING_INSTALL_SCRIPT="Re-downloading the installation script..."
MSG_INSTALL_SCRIPT_DOWNLOAD_COMPLETE="The download is complete. Please re-run the installation script."
MSG_INSTALL_SCRIPT_DOWNLOAD_FAILED="Installation Script Download failed!"
MSG_NON_ROOT_USER="Unable to confirm if it is currently root, the installation may not be possible. Do you want to continue? (y/n)"
#==========================================================

if [ "$ARG1" = "auto" ]; then
	AUTOINSTALL=1
	ROOT_FOLDER=$2
else
	ROOT_FOLDER=$ARG1
fi

# ── Detect correct web folder name (web vs public_html) ──────────────────────
# Transmission ≥ 4.0 moved the web UI from  <share>/web  to  <share>/public_html
detectHtmlFolderName() {
	local base="$1"
	if [ -d "$base/public_html" ]; then
		HTML_FOLDER_NAME="public_html"
	elif [ -d "$base/web" ]; then
		HTML_FOLDER_NAME="web"
	else
		# Fallback: try to ask the running daemon for its version
		local tr_version=""
		if [ -x "$(which transmission-daemon)" ]; then
			tr_version=$(transmission-daemon --version 2>&1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
		elif [ -x "$(which transmission-remote)" ]; then
			tr_version=$(transmission-remote -V 2>&1 | cut -d " " -f 2)
		fi
		local tr_major=${tr_version%%.*}
		if [ -n "$tr_major" ] && [ "$tr_major" -ge 4 ] 2>/dev/null; then
			HTML_FOLDER_NAME="public_html"
		else
			HTML_FOLDER_NAME="web"
		fi
	fi
	showLog "$MSG_DETECTED_HTML_FOLDER $HTML_FOLDER_NAME"
}

initValues() {
	if [ ! -d "$TMP_FOLDER" ]; then
		mkdir -p "$TMP_FOLDER"
	fi

	if [ "$ROOT_FOLDER" == "" ]; then
		getTransmissionPath
	fi

	if [ -d "$ROOT_FOLDER" ]; then
		# Determine the correct sub-folder name for this Transmission version
		if [ -z "$HTML_FOLDER_NAME" ]; then
			detectHtmlFolderName "$ROOT_FOLDER"
		fi
		showLog "$MSG_TR_WORK_FOLDER $ROOT_FOLDER/$HTML_FOLDER_NAME"
		INSTALL_TYPE=3
		WEB_FOLDER="$ROOT_FOLDER/$HTML_FOLDER_NAME"
		SKIP_SEARCH=1
	fi

	if [ "$VERSION" != "" ]; then
		if [ "$VERSION" = "master" ] || [ ${#VERSION} = 40 ]; then
			PACK_NAME="$VERSION.tar.gz"
		elif [ "${VERSION:0:1}" = "v" ]; then
			PACK_NAME="$VERSION.tar.gz"
			VERSION=${VERSION:1}
		else
			PACK_NAME="v$VERSION.tar.gz"
		fi
		showLog "$MSG_SPECIFIED_VERSION $VERSION"
		DOWNLOAD_URL="$WEB_HOST$PACK_NAME"
	fi

	if [ $SKIP_SEARCH = 0 ]; then
		findWebFolder
	fi
}

main() {
	begin
	initValues
	install
	clear
}

# ── Find the web UI directory ─────────────────────────────────────────────────
findWebFolder() {
	showLog "$MSG_SEARCHING_TR_FOLDER"

	if [ "$TRANSMISSION_WEB_HOME" ]; then
		showLog "$MSG_USE_WEB_HOME"
		if [ ! -d "$TRANSMISSION_WEB_HOME" ]; then
			mkdir -p "$TRANSMISSION_WEB_HOME"
		fi
		INSTALL_TYPE=2
		return
	fi

	# Try the known ROOT_FOLDER with either sub-folder name
	if [ -d "$ROOT_FOLDER" ]; then
		detectHtmlFolderName "$ROOT_FOLDER"
		if [ -d "$ROOT_FOLDER/$HTML_FOLDER_NAME" ]; then
			WEB_FOLDER="$ROOT_FOLDER/$HTML_FOLDER_NAME"
			INSTALL_TYPE=1
			showLog "$ROOT_FOLDER/$HTML_FOLDER_NAME $MSG_AVAILABLE."
			return
		fi
	fi

	# Full-tree search – look for both 'web' and 'public_html' under a
	# transmission directory, then determine which applies.
	showLog "$MSG_THE_SPECIFIED_DIRECTORY_DOES_NOT_EXIST"
	local found=""

	# Try public_html first (Transmission 4.0+)
	found=$(find /usr /etc /home /root ./ \
		-name "public_html" -type d 2>/dev/null \
		| grep "transmission/public_html" \
		| sed "s/\/public_html$//g" \
		| head -1)

	if [ -n "$found" ]; then
		ROOT_FOLDER="$found"
		HTML_FOLDER_NAME="public_html"
		WEB_FOLDER="$ROOT_FOLDER/public_html"
		INSTALL_TYPE=1
		showLog "$WEB_FOLDER $MSG_AVAILABLE."
		return
	fi

	# Fallback: try legacy 'web' folder
	found=$(find /usr /etc /home /root ./ \
		-name "web" -type d 2>/dev/null \
		| grep "transmission/web" \
		| sed "s/\/web$//g" \
		| head -1)

	if [ -n "$found" ]; then
		ROOT_FOLDER="$found"
		HTML_FOLDER_NAME="web"
		WEB_FOLDER="$ROOT_FOLDER/web"
		INSTALL_TYPE=1
		showLog "$WEB_FOLDER $MSG_AVAILABLE."
	fi
}

# ── Install ───────────────────────────────────────────────────────────────────
install() {
	if [ "$VERSION" != "" ]; then
		showLog "$MSG_TRY_SPECIFIED_VERSION $VERSION"
		download
		unpack
		showLog "$MSG_PACK_COPYING"
		# GitHub strips the leading 'v' from tag names when naming the archive directory
		# e.g. tag v1.6.1 → transmission-web-control-1.6.1/
		local dir_version="${VERSION#v}"
		cp -r "$TMP_FOLDER/transmission-web-control-$dir_version/src/." "$WEB_FOLDER/"
		setPermissions "$WEB_FOLDER"
		installed

	elif [ $INSTALL_TYPE = 1 ] || [ $INSTALL_TYPE = 3 ]; then
		download
		# Extract master branch archive; GitHub names it transmission-web-control-master/
		unpack
		showLog "$MSG_PACK_COPYING"
		cp -r "$TMP_FOLDER/transmission-web-control-master/src/." "$WEB_FOLDER/"
		setPermissions "$WEB_FOLDER"
		installed

	elif [ $INSTALL_TYPE = 2 ]; then
		download
		unpack
		cp -r "$TMP_FOLDER/transmission-web-control-master/src/." "$TRANSMISSION_WEB_HOME/"
		setPermissions "$TRANSMISSION_WEB_HOME"
		installed

	else
		echo "##############################################"
		echo "#"
		echo "# $MSG_WEB_PATH_IS_MISSING"
		echo "#"
		echo "##############################################"
	fi
}

# ── Download (curl preferred, wget fallback) ──────────────────────────────────
download() {
	cd "$TMP_FOLDER"
	if [ -f "$PACK_NAME" ]; then
		if [ $AUTOINSTALL = 0 ]; then
			printf "\n$PACK_NAME $MSG_PACK_IS_EXIST"
			read flag
		else
			flag="y"
		fi
		if [ "$flag" = "y" ] || [ "$flag" = "Y" ]; then
			rm "$PACK_NAME"
		else
			showLog "$MSG_SIKP_DOWNLOAD"
			return 0
		fi
	fi
	showLog "$MSG_DOWNLOADING"
	echo ""

	# Prefer curl (more reliable on OpenWRT and minimal distros)
	if [ -x "$(which curl)" ]; then
		curl -L --fail --silent --show-error -o "$PACK_NAME" "$DOWNLOAD_URL"
	elif [ -x "$(which wget)" ]; then
		wget "$DOWNLOAD_URL" -O "$PACK_NAME" --no-check-certificate
	else
		showLog "$MSG_WGET_NOT_FIND"
		exit 1
	fi

	if [ $? -eq 0 ]; then
		showLog "$MSG_DOWNLOAD_COMPLETE"
		return 0
	else
		showLog "$MSG_DOWNLOAD_FAILED"
		end
		exit 1
	fi
}

installed() {
	showLog "$MSG_INSTALL_COMPLETE"
}

showLog() {
	local TIME
	TIME=$(date "+%Y-%m-%d %H:%M:%S")
	case $2 in
		"n") printf "<< %s >> %s" "$TIME" "$1" ;;
		*)   echo   "<< $TIME >> $1" ;;
	esac
}

# ── Unpack ────────────────────────────────────────────────────────────────────
unpack() {
	showLog "$MSG_PACK_EXTRACTING"
	if [ "$1" != "" ]; then
		tar -xzf "$PACK_NAME" -C "$1"
	else
		tar -xzf "$PACK_NAME"
	fi
	if [ ! -f "$WEB_FOLDER/$ORG_INDEX_FILE" ] && [ -f "$WEB_FOLDER/$INDEX_FILE" ]; then
		mv "$WEB_FOLDER/$INDEX_FILE" "$WEB_FOLDER/$ORG_INDEX_FILE"
	fi
	if [ -d "$WEB_FOLDER/tr-web-control" ]; then
		rm -rf "$WEB_FOLDER/tr-web-control"
	fi
}

clear() {
	showLog "$MSG_PACK_CLEANING_UP"
	[ -f "$PACK_NAME"   ] && rm "$PACK_NAME"
	[ -d "$TMP_FOLDER"  ] && rm -rf "$TMP_FOLDER"
	showLog "$MSG_DONE"
	end
}

setPermissions() {
	local folder="$1"
	showLog "$MSG_SETTING_PERMISSIONS"
	find "$folder" -type d -exec chmod o+rx {} \;
	find "$folder" -type f -exec chmod o+r  {} \;
}

begin() {
	echo ""
	showLog "== $MSG_BEGIN =="
	showLog ""
}

end() {
	showLog "== $MSG_END =="
	echo ""
}

# ── Main menu ─────────────────────────────────────────────────────────────────
showMainMenu() {
	printf "%s" "$MSG_MAIN_MENU"
	read flag
	echo ""
	case $flag in
		1)  getLatestReleases; main ;;
		2)  printf "%s" "$MSG_INPUT_VERSION"; read VERSION; main ;;
		3)  revertOriginalUI ;;
		4)  downloadInstallScript ;;
		5)  checkTransmissionDaemon ;;
		6)
			printf "%s" "$MSG_INPUT_TR_FOLDER"
			read input
			# Accept paths with or without the trailing web/public_html
			input=$(echo "$input" | sed 's|/web$||;s|/public_html$||')
			if [ -d "$input" ]; then
				ROOT_FOLDER="$input"
				detectHtmlFolderName "$ROOT_FOLDER"
				if [ -d "$ROOT_FOLDER/$HTML_FOLDER_NAME" ]; then
					showLog "$MSG_SPECIFIED_FOLDER $ROOT_FOLDER/$HTML_FOLDER_NAME"
				else
					showLog "$MSG_INVALID_PATH"
				fi
			else
				showLog "$MSG_INVALID_PATH"
			fi
			sleep 2
			showMainMenu
			;;
		9)
			printf "%s" "$MSG_MASTER_INSTALL_CONFIRM"
			read input
			if [ "$input" = "y" ] || [ "$input" = "Y" ]; then
				VERSION="master"
				main
			else
				showMainMenu
			fi
			;;
		*) showLog "$MSG_END" ;;
	esac
}

# ── Detect Transmission installation path ────────────────────────────────────
getTransmissionPath() {
	if [ ! -d "$ROOT_FOLDER" ]; then
		# Common distro paths
		if [ -f "/etc/fedora-release" ] || [ -f "/etc/debian_version" ] || [ -f "/etc/openwrt_release" ]; then
			ROOT_FOLDER="/usr/share/transmission"
		fi
		if [ -f "/bin/freebsd-version" ]; then
			ROOT_FOLDER="/usr/local/share/transmission"
		fi

		# Synology NAS – version-aware folder detection (Tr 2.x uses web, 3.x+ uses public_html)
		if [ -f "/etc/synoinfo.conf" ]; then
			TRANSMISSION_REMOTE="/var/packages/transmission/target/bin/transmission-remote"
			if [ -x "$TRANSMISSION_REMOTE" ]; then
				local tr_version
				tr_version=$("$TRANSMISSION_REMOTE" -V 2>&1 | cut -d " " -f 2)
				showLog "transmission version: $tr_version"
				local tr_major=${tr_version%%.*}
				if [ -n "$tr_major" ] && [ "$tr_major" -ge 3 ] 2>/dev/null; then
					HTML_FOLDER_NAME="public_html"
				else
					HTML_FOLDER_NAME="web"
				fi
			fi
			ROOT_FOLDER="/var/packages/transmission/target/share/transmission"
		fi
	fi

	# If ROOT_FOLDER is set and HTML_FOLDER_NAME is still empty, auto-detect it
	if [ -d "$ROOT_FOLDER" ] && [ -z "$HTML_FOLDER_NAME" ]; then
		detectHtmlFolderName "$ROOT_FOLDER"
	fi

	# Process-based detection as last resort
	if [ ! -d "$ROOT_FOLDER" ]; then
		showLog "$MSG_FIND_WEB_FOLDER_FROM_PROCESS" "n"
		local infos
		infos=$(ps -Aww -o command= 2>/dev/null | sed -r -e '/[t]ransmission-da/!d' -e 's/ .+//')
		if [ -n "$infos" ]; then
			echo " √"
			local search="bin/transmission-daemon"
			local replace="share/transmission"
			local path="${infos//$search/$replace}"
			if [ -d "$path" ]; then
				ROOT_FOLDER="$path"
				detectHtmlFolderName "$ROOT_FOLDER"
			fi
		else
			echo "$MSG_FIND_WEB_FOLDER_FROM_PROCESS_FAILED"
		fi
	fi
}

getLatestReleases() {
	if [ -x "$(which curl)" ]; then
		VERSION=$(curl -s "$LAST_RELEASES" | grep tag_name | head -n 1 | cut -d '"' -f 4)
	elif [ -x "$(which wget)" ]; then
		VERSION=$(wget -O - "$LAST_RELEASES" 2>/dev/null | grep tag_name | head -n 1 | cut -d '"' -f 4)
	else
		showLog "$MSG_WGET_NOT_FIND"
		exit 1
	fi
}

checkTransmissionDaemon() {
	showLog "$MSG_CHECK_TR_DAEMON"
	ps -C transmission-daemon
	if [ $? -ne 0 ]; then
		showLog "$MSG_CHECK_TR_DAEMON_FAILED"
		printf "%s" "$MSG_TRY_START_TR"
		read input
		if [ "$input" = "y" ] || [ "$input" = "Y" ]; then
			service transmission-daemon start
		fi
	else
		showLog "$MSG_TR_DAEMON_IS_STARTED"
	fi
	sleep 2
	showMainMenu
}

revertOriginalUI() {
	initValues
	if [ -f "$WEB_FOLDER/$ORG_INDEX_FILE" ]; then
		showLog "$MSG_REVERTING_ORIGINAL_UI"
		if [ -d "$WEB_FOLDER/tr-web-control" ]; then
			rm -rf "$WEB_FOLDER/tr-web-control"
			rm -f  "$WEB_FOLDER/favicon.ico"
			rm -f  "$WEB_FOLDER/index.html"
			rm -f  "$WEB_FOLDER/index.mobile.html"
			mv "$WEB_FOLDER/$ORG_INDEX_FILE" "$WEB_FOLDER/$INDEX_FILE"
			showLog "$MSG_REVERT_COMPLETE"
		else
			showLog "$MSG_WEB_PATH_IS_MISSING"
			sleep 2
			showMainMenu
		fi
	else
		showLog "$MSG_ORIGINAL_UI_IS_MISSING"
		sleep 2
		showMainMenu
	fi
}

downloadInstallScript() {
	[ -f "$SCRIPT_NAME" ] && rm "$SCRIPT_NAME"
	showLog "$MSG_DOWNLOADING_INSTALL_SCRIPT"
	if [ -x "$(which curl)" ]; then
		curl -L --fail -o "$SCRIPT_NAME" \
			"https://github.com/Ratz77/transmission-web-control/raw/master/release/$SCRIPT_NAME"
	else
		wget "https://github.com/Ratz77/transmission-web-control/raw/master/release/$SCRIPT_NAME" \
			--no-check-certificate
	fi
	if [ $? -eq 0 ]; then
		showLog "$MSG_INSTALL_SCRIPT_DOWNLOAD_COMPLETE"
	else
		showLog "$MSG_INSTALL_SCRIPT_DOWNLOAD_FAILED"
		sleep 2
		showMainMenu
	fi
}

# ── Entry point ───────────────────────────────────────────────────────────────
if [ "$USER" != 'root' ]; then
	showLog "$MSG_NON_ROOT_USER" "n"
	read input
	if [ "$input" = "n" ] || [ "$input" = "N" ]; then
		exit 1
	fi
fi

if [ $AUTOINSTALL = 1 ]; then
	getLatestReleases
	main
else
	showMainMenu
fi
