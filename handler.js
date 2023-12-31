const SERVER_SOCKET_ENDPOINT = "liquid-breakout-bot.onrender.com/socket";

let connected = false;

const usernameInputDiv = document.getElementById("usernameInput");
const usernameField = document.getElementById("username");
const connectButton = document.getElementById("connect");

const connectInfoDiv = document.getElementById("connectInfo");
const infoText = document.getElementById("info");
const reconnectButton = document.getElementById("reconnect");
const bgmInfoText = document.getElementById("bgmInfo");

const volumeInfoText = document.getElementById("volumeInfo");
const volumeRangeSlider = document.getElementById("volumeRange");

const playingAudio = new Audio();
playingAudio.loop = true;
let audioStartUtcTime = undefined;
let audioVolumeMultiplier = 1;
let audioFadeInterval = undefined;

const startPlayingEvent = new Event("startPlaying");
const webWorker = new Worker("worker.js");

function data(socketMessage) {
    let returnedData = undefined;
    try {
        returnedData = JSON.parse(socketMessage);
    } catch (e) {}
    return returnedData
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function fixToFinite(n) {
    return parseFloat(n).toPrecision(12);
}

function formatSeconds(seconds) {
    if (isNaN(seconds) || seconds == Infinity) {
        return "??:??:??";
    }
    var date = new Date(0);
    date.setSeconds(seconds);
    return date.toISOString().substring(11, 19);
}

function setConnectGroupVisibility(value) {
    usernameInputDiv.hidden = !value;
    connectInfoDiv.hidden = value;
}

function getSelectedRadioValueByTag(tagName) {
    const currentlySelecting = document.querySelector(`input[name="${tagName}"]:checked`);
    if (currentlySelecting) {
        return currentlySelecting.value;
    }
    return undefined;
}

function playMusic(url, startUtcTime) {
    transitionVolumeMultiplier(0, 1);
    audioStartUtcTime = startUtcTime;
    playingAudio.src = url;
    playingAudio.play()
        .then(() => playingAudio.dispatchEvent(startPlayingEvent))
        .catch(() => bgmInfoText.innerHTML = "No IO source.");
}

function transitionVolumeMultiplier(time, volumeMultiplier) {
    if (audioFadeInterval != undefined) {
        clearInterval(audioFadeInterval);
    }
    if (time <= 0) {
        audioVolumeMultiplier = volumeMultiplier;
        return new Promise(resolve => resolve());
    }

    const originalMultiplier = audioVolumeMultiplier;
    const interval = 20;

    const delta = volumeMultiplier - originalMultiplier;
    const ticks = Math.floor(time * 1000 / interval);
    let tick = 1;

    return new Promise(resolve => {
        audioFadeInterval = setInterval(() => {
            audioVolumeMultiplier = originalMultiplier + tick / ticks * delta;
    
            if (++tick === ticks + 1) {
                if (audioFadeInterval != undefined) {
                    clearInterval(audioFadeInterval);
                    audioFadeInterval = undefined;
                }
                resolve();
            }
        }, interval);
    })
}

function stopMusic() {
    playingAudio.pause();
    if (!isNaN(playingAudio.duration) && playingAudio.duration != Infinity) {
        playingAudio.currentTime = playingAudio.duration;
    }
}

function connect() {
    if (connected) {
        return;
    }
    setConnectGroupVisibility(false);
    reconnectButton.hidden = true;
    infoText.innerHTML = "Connecting...";
    bgmInfoText.innerHTML = "Standby...";

    const socketConnection = new WebSocket(`wss://${SERVER_SOCKET_ENDPOINT}/websocket`);
    socketConnection.addEventListener("open", () => {
        // Connect to io socket
        socketConnection.send(JSON.stringify({
            type: "connect",
            connectionType: "io",
            username: usernameField.value
        }));
    });
    
    socketConnection.addEventListener("message", (e) => {
        if (!e.data) {
            return;
        }

        let receivedData = data(e.data);
        if (!receivedData) {
            return;
        }
        
        if (receivedData.type == "connectSuccess") {
            connected = true;
            infoText.innerHTML = `Connected to IO with user: ${usernameField.value}`;
        } else {
            if (receivedData.status == "ingame") {
                // play music with data.bgm
                // sync using data.startUtcTime
                playMusic(receivedData.bgm, receivedData.startUtcTime);
            } else if (receivedData.status == "died") {
                // fade music
                const onDeathOption = getSelectedRadioValueByTag("death_radio");
                if (onDeathOption == "quieten") {
                    transitionVolumeMultiplier(1, .5);
                } else if (onDeathOption == "stop") {
                    transitionVolumeMultiplier(1, 0).then(() => stopMusic());
                }
            } else if (receivedData.status == "leftGame") {
                // fade music 2
                const onLeaveOption = getSelectedRadioValueByTag("leave_radio");
                if (onLeaveOption == "stop") {
                    transitionVolumeMultiplier(1, 0).then(() => stopMusic());
                }
            }
            // The problem with having this is that
            // We could end up reaching Roblox's HTTP requests limit
            /*else if (receivedData.status == "spectating") {
                // play music at time pos
                // sync using data.startUtcTime
            }*/
        }
    });
    
    socketConnection.addEventListener("close", () => {
        // Disconnected
        connected = false;
        stopMusic();
        infoText.innerHTML = "Disconnected from IO.";
        reconnectButton.hidden = false;
    });
}

playingAudio.addEventListener("startPlaying", () => {
    if (audioStartUtcTime == undefined) {
        return;
    }
    let currentStartUtcTime = new Date().getTime() / 1000;
    playingAudio.currentTime = fixToFinite(currentStartUtcTime - audioStartUtcTime);
});

playingAudio.addEventListener("timeupdate", () => {
    if (isNaN(playingAudio.duration) || playingAudio.duration === Infinity) {
        bgmInfoText.innerHTML = "Loading audio.";
    } else {
        bgmInfoText.innerHTML = `Playing; ${formatSeconds(playingAudio.currentTime)}/${formatSeconds(playingAudio.duration)}`;
    }
});

playingAudio.addEventListener("ended", () => {
    bgmInfoText.innerHTML = "Playback Finished";
})

connectButton.addEventListener("click", connect);
reconnectButton.addEventListener("click", connect);

volumeRangeSlider.addEventListener("input", () => {
    volumeInfoText.innerHTML = `Volume: ${volumeRangeSlider.value}%`;
});

volumeInfoText.innerHTML = `Volume: ${volumeRangeSlider.value}%`;

webWorker.addEventListener("message", e => {
    let data = e.data;
    if (data.action == "update") {
        playingAudio.volume = volumeRangeSlider.value / 100 * fixToFinite(audioVolumeMultiplier);
    }
});