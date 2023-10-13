const SERVER_SOCKET_ENDPOINT = "liquid-breakout-bot.onrender.com/socket";

let connected = false;

const usernameInputDiv = document.getElementById("usernameInput");
const usernameField = document.getElementById("username");
const connectButton = document.getElementById("connect");

const connectInfoDiv = document.getElementById("connectInfo");
const infoText = document.getElementById("info");
const bgmInfoText = document.getElementById("bgmInfo");

const volumeInfoText = document.getElementById("volumeInfo");
const volumeRangeSlider = document.getElementById("volumeRange");

const playingAudio = new Audio();
let audioStartUtcTime = undefined;

function data(socketMessage) {
    let returnedData = undefined;
    try {
        returnedData = JSON.parse(socketMessage);
    } catch (e) {}
    return returnedData
}

function formatSeconds(seconds) {
    var date = new Date(0);
    date.setSeconds(seconds);
    return date.toISOString().substring(11, 19);
}

function setConnectGroupVisibility(value) {
    usernameInputDiv.hidden = !value;
    connectInfoDiv.hidden = value;
}

function getSelectedRadioValueByTag(tagName) {
    const elements = document.getElementsByTagName(tagName);
    for (i = 0; i < elements.length; i++) {
        if (elements[i].type = "radio") {
            if (elements[i].checked) {
                return elements[i].value;
            }
        }
    }
}

function playMusic(url, startUtcTime) {
    audioStartUtcTime = startUtcTime;
    playingAudio.src = url;
    playingAudio.play();
}

function connect() {
    if (connected) {
        return;
    }
    console.log(usernameField.value)

    const socketConnection = new WebSocket(`wss://${SERVER_SOCKET_ENDPOINT}/websocket`);
    socketConnection.onopen = function() {
        // Connect to io socket
        socketConnection.send(JSON.stringify({
            type: "connect",
            connectionType: "io",
            username: usernameField.value
        }));
    }
    
    socketConnection.onmessage = function(e) {
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
            playMusic("https://github.com/NumPix/pygame-touhou/raw/main/assets/music/09.-Locked-Girl-_-The-Girl_s-Secret-Room.wav");
        } else {
            if (receivedData.status == "ingame") {
                // play music with data.bgm
                // sync using data.startUtcTime
                playMusic(receivedData.bgm, receivedData.startUtcTime);
            } else if (receivedData.status == "died") {
                // fade music and stop
            }
            // The problem with having this is that
            // We could end up reaching Roblox's HTTP requests limit
            /*else if (receivedData.status == "spectating") {
                // play music at time pos
                // sync using data.startUtcTime
            }*/
        }
    };
    
    socketConnection.onclose = function() {
        // Disconnected, will attempt to re-establish if the option is there
        connected = false;
        infoText.innerHTML = "Disconnected...";
        setConnectGroupVisibility(true);
    };
}

playingAudio.addEventListener("canplay", () => {
    if (audioStartUtcTime == undefined) {
        return;
    }
    playingAudio.currentTime = (new Date().getUTCSeconds() - audioStartUtcTime) * 10 / 1000;
});

playingAudio.addEventListener("timeupdate", () => {
    bgmInfoText.innerHTML = `Playing; ${formatSeconds(playingAudio.currentTime)}/${formatSeconds(playingAudio.duration)}`;
});

playingAudio.addEventListener("ended", () => {
    bgmInfoText.innerHTML = "Playback Finished";
})

connectButton.addEventListener("click", () => {
    setConnectGroupVisibility(false);
    infoText.innerHTML = "Connecting...";
    bgmInfoText.innerHTML = "Standby...";
    connect();
});

volumeRangeSlider.addEventListener("input", () => {
    volumeInfoText.innerHTML = `Volume: ${volumeRangeSlider.value}%`
    playingAudio.volume = volumeRangeSlider.value / 100;
});

volumeInfoText.innerHTML = `Volume: ${volumeRangeSlider.value}%`;