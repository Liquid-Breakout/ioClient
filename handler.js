const SERVER_SOCKET_ENDPOINT = "liquid-breakout-bot.onrender.com/socket";

let connected = false;

const userBoxTitle = document.getElementById("userBoxTitle");
const usernameField = document.getElementById("username");
const infoText = document.getElementById("info");
const connectButton = document.getElementById("connect");

function data(socketMessage) {
    let returnedData = undefined;
    try {
        returnedData = JSON.parse(socketMessage);
    } catch (e) {}
    return returnedData
}

function setConnectGroupVisibility(value) {
    usernameField.style.display = value == true ? undefined : "none";
    connectButton.style.display = value == true ? undefined : "none";
    infoText.style.display = value == true ? "none" : undefined;
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
        } else {
            if (receivedData.status == "ingame") {
                // play music with data.bgm
                // sync using data.startUtcTime
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
        userBoxTitle.innerHTML = "Enter Username:"
        setConnectGroupVisibility(true);
    };
}

document.getElementById("connect").addEventListener("click", () => {
    setConnectGroupVisibility(false);
    userBoxTitle.innerHTML = "IO:"
    infoText.innerHTML = "Connecting...";
    connect();
})