const SERVER_SOCKET_ENDPOINT = "https://liquid-breakout-bot.onrender.com/socket";

let connected = false;

function data(socketMessage) {
    let returnedData = undefined;
    try {
        returnedData = JSON.parse(socketMessage);
    } catch (e) {}
    return returnedData
}

function connect() {
    if (connected) {
        return;
    }

    const socketConnection = new WebSocket(`${SERVER_SOCKET_ENDPOINT}/websocket`);
    socketConnection.onopen = function() {
        // Connect to io socket
        socketConnection.send(JSON.stringify({type: "connect", connectionType: "io"}));
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
        } else {
            if (receivedData.status == "ingame") {
                // play music with data.bgm
                // sync using data.startUtcTime
            } else if (receivedData.status == "died") {
                // fade music and stop
            } else if (receivedData.status == "spectating") {
                // play music at time pos
                // sync using data.startUtcTime
            }
        }
    };
    
    socketConnection.onclose = function() {
        // Disconnected, will attempt to re-establish if the option is there
        connected = false;
    };
}