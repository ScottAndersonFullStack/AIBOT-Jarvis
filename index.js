let coords = "";
let latitude;
let longitude;
let locationData;
let now = new Date().toDateString();
let theWeather;
let tomorrowsWeather;
let hasStarted = false;
//--------------WEATHER SERVICES---------------
async function getForecast() {
  let weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${privateCode}`;
  $.ajax({
    type: "GET",
    url: weatherUrl,
    dataType: "json",
    data: JSON.stringify({
      lang: "en"
    }),
    success: function(data) {
      tomorrowsWeather = `the weather tomorrow is ${
        data.list[5].weather[0].description
      }`;
    },
    error: function() {
      respond(messageInternalError);
    }
  });
}
async function getWeather() {
  let weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${privateCode}`;
  $.ajax({
    type: "GET",
    url: weatherUrl,
    dataType: "json",
    data: JSON.stringify({
      lang: "en"
    }),
    success: function(data) {
      theWeather = `the weather today is ${data.weather[0].description}`;
    },
    error: function() {
      respond(messageInternalError);
    }
  });
}

//---------------LOCATION SERVICES----------------
async function findMe() {
  let url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
  $.ajax({
    type: "GET",
    url: url,
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    data: JSON.stringify({
      lang: "en"
    }),
    success: function(data) {
      console.log(data);
      if (data.address.city) {
        locationData = data.address.city;
      } else {
        locationData = data.address.county;
      }
    },
    error: await function() {
      respond(messageInternalError);
    }
  });
}
//------------------INFO SETUP------------------------
navigator.geolocation.getCurrentPosition(async pos => {
  console.log("running");
  coords = `${pos.coords.latitude}, ${pos.coords.longitude}`;
  latitude = pos.coords.latitude;
  longitude = pos.coords.longitude;
});
function start() {
  findMe();
  getWeather();
  getForecast();
}

//------------------AI BOT SETUP----------------------
var accessToken = `${privateKey}`,
  baseUrl = "https://api.api.ai/v1/",
  $speechInput,
  $recBtn,
  recognition,
  messageRecording = "Recording...",
  messageCouldntHear = "I couldn't hear you, could you say that again?",
  messageInternalError = "Oh no, there has been an internal server error",
  messageSorry = "I'm sorry, I don't have the answer to that yet.";
$(document).ready(function() {
  $speechInput = $("#speech");
  $recBtn = $("#rec");
  $speechInput.keypress(function(event) {
    if (event.which == 13) {
      event.preventDefault();
      send();
    }
  });
  $recBtn.on("click", function(event) {
    if (!hasStarted) {
      start();
      hasStarted = true;
    }
    switchRecognition();
  });
  $(".debug__btn").on("click", function() {
    $(this)
      .next()
      .toggleClass("is-active");
    return false;
  });
});

//---------------SPEECH APIs-----------------
function startRecognition() {
  recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  //sets the onstart function
  recognition.onstart = function(event) {
    respond(messageRecording);
    updateRec();
  };
  recognition.onresult = function(event) {
    //intitalizes on end.
    recognition.onend = null;
    var text = "";
    for (var i = event.resultIndex; i < event.results.length; ++i) {
      text += event.results[i][0].transcript;
    }
    setInput(text);
    stopRecognition();
  };
  //sets what's suppose to happen on end of speech
  recognition.onend = function() {
    respond(messageCouldntHear);
    stopRecognition();
  };
  recognition.lang = "en-US";
  recognition.start();
}

function stopRecognition() {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
  updateRec();
}
function switchRecognition() {
  if (recognition) {
    stopRecognition();
  } else {
    startRecognition();
  }
}
function setInput(text) {
  $speechInput.val(text);
  send();
}
function updateRec() {
  $recBtn.text(recognition ? "Stop" : "Speak");
}
function send() {
  var text = $speechInput.val();
  $.ajax({
    type: "POST",
    url: baseUrl + "query",
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    headers: {
      Authorization: "Bearer " + accessToken
    },
    data: JSON.stringify({
      query: text,
      lang: "en",
      sessionId: "yaydevdiner"
    }),
    success: function(data) {
      prepareResponse(data);
    },
    error: function() {
      respond(messageInternalError);
    }
  });
}

//--------------BOT RESPONSE--------------
async function prepareResponse(val) {
  var debugJSON = JSON.stringify(val, undefined, 2),
    spokenResponse = val.result.speech;
  if (spokenResponse === "What is the date?") {
    spokenResponse = now;
  } else if (spokenResponse === "Where am I?") {
    spokenResponse = locationData;
  } else if (spokenResponse === "latitude, longitude") {
    spokenResponse = `${latitude}, ${longitude}`;
  } else if (spokenResponse === "Today is weather") {
    spokenResponse = theWeather;
  } else if (spokenResponse === "Tomorrow is weather") {
    spokenResponse = tomorrowsWeather;
  }
  respond(spokenResponse);
  debugRespond(debugJSON);
}
function debugRespond(val) {
  $("#response").text(val);
}
function respond(val) {
  if (val == "") {
    val = messageSorry;
  }
  if (val !== messageRecording) {
    var msg = new SpeechSynthesisUtterance();
    msg.voiceURI = "native";
    msg.text = val;
    msg.lang = "en-US";
    window.speechSynthesis.speak(msg);
  }
  $("#spokenResponse")
    .addClass("is-active")
    .find(".spoken-response__text")
    .html(val);
}
