const Cookies = require("js-cookie");
const cheerio = require("cheerio");

let initialLoaded = false;

let cars = [               // This var not used - instead, for readability
    carson = {
        mpg: 11
    },
    ellyn = {
        mpg: 22
    },
    charlie = {
        mpg: 0
    }
];

let position = {
    posx: 0,
    posy: 0
};

let started = false;
let seconds = 0;
let timeBox = document.getElementById("time");

// Counting vars to be used with setTimeout
let counting;
let locationTracking;

function getLocation() {
    if (navigator && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            locationSuccess(position);
        }, function(error) {
            locationError(error);
        }, {
            enableHighAccuracy: true,
            maximumAge: 3000,
            timeout: 10000
        });
    } else {
        console.log("Geolocation is not supported by this browser.");
    }
}

function locationSuccess(pos) {
    position = {
        posx: pos.coords.latitude,
        posy: pos.coords.longitude
    };
    mapboxgl.accessToken = 'pk.eyJ1IjoidGJhdW1lcjIyIiwiYSI6ImNqcTA5Zm84YjAzaGk0OHF1ZXc0MzAza2UifQ.EPYjLIhlhHwnN-OJN6AZQg';
    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/tbaumer22/cjq09i6410gc12rpiyl1kgbaj',
        center: [pos.coords.longitude, pos.coords.latitude],
        zoom: 15.0
    });
    let marker = new mapboxgl.Marker()
        .setLngLat([pos.coords.longitude, pos.coords.latitude])
        .addTo(map);
    if (started) {
        recordAndCalculate(pos.coords.latitude, pos.coords.longitude);
    }
    if (!initialLoaded) {
        initialLoaded = true;
        let loadingHero = document.getElementById("loading-hero");
        loadingHero.classList.add("hide-opacity");
        setTimeout(function () {
            loadingHero.style.display = "none";
        }, 1000);
    }
}

function locationError(error) {
    console.log(error);
}

function grabGasPrice() {
    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState === 4 && this.status === 200) {
            // Typical action to be performed when the document is ready:
            const $ = cheerio.load(xhttp.responseText);
            let price = $('.header__header1___3U_VP').text();
            let priceArr = price.split("$");
            price = priceArr[2];
            if (price === undefined || price === "undefined") {
                document.getElementById("fuel-price").innerText = "Fuel price could not be determined";
                Cookies.set('gas-price', 2.00);
            } else {
                document.getElementById("fuel-price").innerHTML = "<b>Current fuel price:</b> $" + price;
                Cookies.set('gas-price', price);
            }
        }
    };
    xhttp.open("GET", "https://cors-anywhere.herokuapp.com/https://www.gasbuddy.com/station/71111", true);
    xhttp.send();
}

document.getElementById("start-button").onclick = function() {
    Cookies.set('ride-cost', 0);
    Cookies.set('distance-travelled', '0');
    Cookies.set('start-pos-x', position.posx);
    Cookies.set('start-pos-y', position.posy);
    //Cookies.set('time', new Date());
    toggleStart();
};

document.getElementById("permission-button").onclick = function () {
    this.innerText = "";
    getLocation();
};

function toggleStart() {
    let startButton = document.getElementById("start-button");
    let divider = document.getElementById("divider");
    let divider2 = document.getElementById("divider2");
    let carSelect = document.getElementById("car-select");
    let carSelectElem = document.getElementById("car-select-elem");
    if (started) {
        startButton.innerHTML = "Start ride";
        startButton.classList.remove("is-danger");
        startButton.classList.add("is-success");
        divider.style.background = "#1BD160";
        divider2.style.background = "#1BD160";
        carSelect.classList.remove("is-danger");
        carSelect.classList.add("is-success");
        carSelectElem.disabled = false;
        started = false;
        window.clearTimeout(locationTracking);
        window.clearTimeout(counting);
        seconds = 0;
    } else {
        startButton.innerHTML = "<i class=\"fas fa-street-view\"></i>&nbsp;&nbsp;Stop ride";
        startButton.classList.remove("is-success");
        startButton.classList.add("is-danger");
        divider.style.background = "#FF375F";
        divider2.style.background = "#FF375F";
        carSelect.classList.remove("is-success");
        carSelect.classList.add("is-danger");
        carSelectElem.disabled = true;
        started = true;
        locationTracking = setInterval(getLocation, 1000 * 15);
        counting = setInterval(counter, 1000);
    }
}

function recordAndCalculate(newx, newy) {
    let selected = document.getElementById("car-select-elem");
    let distElem = document.getElementById("distance-travelled");
    let owedElem = document.getElementById("amount-owed");
    let gasPrice = parseFloat(Cookies.get('gas-price'));
    let oldx = parseFloat(Cookies.get('start-pos-x'));
    let oldy = parseFloat(Cookies.get('start-pos-y'));
    let oldDis = parseFloat(Cookies.get('distance-travelled'));
    let oldRideCost = parseFloat(Cookies.get('ride-cost'));

    let distance = getDistanceFromLatLonInKm(oldx, oldy, newx, newy);
    distance = distance * 0.621371;   // KM to MI
    // console.log("Distance: " + distance);
    oldDis += distance;

    // (Distance / MPG) * Gas Price = Cost of ride
    let costOfRide = (distance / parseFloat(selected.value)) * gasPrice;
    // console.log("Cost of Ride: $" + costOfRide);
    oldRideCost += costOfRide;

    // Updating UI
    distElem.innerHTML = "<b>Distance travelled:</b> " + oldDis.toFixed(4) + "mi";
    owedElem.innerHTML = "<b>Ride cost:</b> $" + oldRideCost.toFixed(2);

    Cookies.set('start-pos-x', newx);
    Cookies.set('start-pos-y', newy);
    Cookies.set('distance-travelled', oldDis);
    Cookies.set('ride-cost', oldRideCost);
}

// Thanks to: https://stackoverflow.com/a/27943/10350213
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    let R = 6371; // Radius of the earth in km
    let dLat = deg2rad(lat2 - lat1);  // deg2rad below
    let dLon = deg2rad(lon2 - lon1);
    let a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ;
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    let d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

function counter() {
    seconds++;
    let newTime = fancyTimeFormat(seconds);
    timeBox.innerHTML = "<b>Ride Duration:</b> " + newTime;
}

// Thanks to: https://stackoverflow.com/a/11486026/10350213
function fancyTimeFormat(time)
{
    // Hours, minutes and seconds              // ~~ is Math.floor
    var hrs = ~~(time / 3600);
    var mins = ~~((time % 3600) / 60);
    var secs = ~~time % 60;

    // Output like "1:01" or "4:03:59" or "123:03:59"
    var ret = "";

    if (hrs > 0) {
        ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
    }

    ret += "" + mins + ":" + (secs < 10 ? "0" : "");
    ret += "" + secs;
    return ret;
}

function endRide() {
    started = false;
}

//getLocation();
grabGasPrice();
// console.log(getDistanceFromLatLonInKm(37.3097184, -80.0621986, 36.3097184, -81.0621986));