import fs from "fs";
import utils from "./utils.js";
import htmlWorker from "./htmlWorker.js";

let klickaudSet = {
    downloader_token: "",
    downloader_token1: "",
    downloader_cookie: "",
    downloader_token_time: new Date()
};
let scdrSet = {
    downloader_token: "",
    downloader_token1: "testdummy",
    downloader_cookie: "",
    downloader_token_time: new Date()
};

let SC_id = "3UT1QkKC2kBqMLmSnbLbIps1suqeSlRs";


function getImgUrlAndUser(body, callback) {
    try {
        //img
        let startStr = "<img src=\"";
        let endStr = "\" width=\"500\" height=\"500\" alt=\"";
        let img = body.substr(body.indexOf(startStr));
        img = img.substr(startStr.length, img.indexOf(endStr) - startStr.length);

        //by
        startStr = "by <a href=\"";
        endStr = "</a></h1>";
        let by = body.substr(body.indexOf(startStr));
        by = by.substr(by.indexOf(">") + 1);
        by = by.substr(0, by.indexOf(endStr));

        if (callback) callback({img: img, user: by});
    } catch (e) {
        if (callback) callback(null, e);
    }

    //fs.writeFile("data.json", cleanStringify(root), ()=>{});
    //fs.writeFile("data.html", bodynorm, ()=>{});
}

function getTracksUrls(url, callback) {
    htmlWorker.getHtml(`https://api.soundcloud.com/resolve?url=${url}&client_id=${SC_id}`, (body, err) => {
        if (err) {
            if (callback) callback(null, err);
            return;
        }
        let result1 = JSON.parse(body);
        //fs.writeFile("data.json", body, ()=>{});
        if (result1.kind && result1.kind === "playlist") {
            let tracksNames = result1.tracks.map((e) => {
                return {performer:e.user.username, trackName:e.title};
            });
            //console.log(tracksNames);
            validateDownloaderTokenScdd(() => {
                let form = {
                    "soundCloudPlay": 1,
                    "sitelink": url
                };
                //form[klickaudSet.downloader_token1] = klickaudSet.downloader_token;

                htmlWorker.getHtml("https://theseotools.net/?route=soundcloud-ajax", (body, err) => {
                        if (!err) {
                            try {
                                //fs.writeFile("data.html", body, ()=>{});

                                let tracks = [];

                                let url = "<a title=\"Track Link\" href=\"";
                                let start = body.indexOf(url);
                                let end = 0;
                                let curr = body;
                                let i = 0;
                                while (start > 0) {
                                    let tmp = "title=\"Download the track\" href=\"";
                                    start = curr.indexOf(tmp);
                                    curr = curr.substr(start);
                                    end = curr.indexOf("\">Download Link");
                                    
                                    let obj = {
                                        name: tracksNames[i].trackName,
                                        performer:tracksNames[i].performer,
                                        url: ""
                                    };
                                    obj.url = curr.substr(tmp.length, end - tmp.length);

                                    curr = curr.substr(tmp.length);

                                    tracks.push(obj);
                                    start = curr.indexOf(tmp);
                                    i++;
                                }


                                if (callback) callback(tracks);


                            } catch (e) {
                                if (callback) callback(null, e);
                                console.log(e);
                            }
                        } else {
                            console.log(err);
                        }

                    }, form,
                    {
                        referer: "http://playlist.klickaud.com/",
                        origin: "http://playlist.klickaud.com/",
                        cookie: scdrSet.downloader_cookie,
                        "upgrade-insecure-requests": 1
                    }
                );
            });
        } else {
            if (callback) callback(null, "Its not a playlist");
        }
    });
}

function getMusicUrl(url, callback) {
    htmlWorker.getHtml(`https://api.soundcloud.com/resolve?url=${url}&client_id=${SC_id}`, (body, err) => {
        if (err) {
            if (callback) callback(null, err);
            return;
        }
        let result1 = JSON.parse(body);
        //fs.writeFile("data.json", body, ()=>{});
        if (result1.kind && result1.kind === "track") {
            let trackName = result1.title;
            let performer = result1.user.username;
                validateDownloaderTokenKlick(() => {
                let form = {
                    "value": url
                };
                form[klickaudSet.downloader_token1] = klickaudSet.downloader_token;

                htmlWorker.getHtml("https://www.klickaud.net/download.php", (body, err) => {
                        if (!err) {
                            try {
                                //fs.writeFile("data.html", body, ()=>{});

                                let startStr = "downloadFile('";
                                let endStr = "',";
                                let url = body.substr(body.indexOf(startStr));
                                url = url.substr(startStr.length, url.indexOf(endStr) - startStr.length);

                                // startStr = "/td><td class='small-10 columns'>";
                                // endStr = "</td>";
                                // let name = body.substr(body.indexOf(startStr));
                                // name = name.substr(startStr.length, name.indexOf(endStr) - startStr.length);

                                if (callback) callback({url: url, name: trackName, performer:performer});


                            } catch (e) {
                                if (callback) callback(null, e);
                                console.log(e);
                            }
                        } else {
                            console.log(err);
                        }

                    }, form,
                    {
                        referer: "https://www.klickaud.net/",
                        origin: "https://www.klickaud.net/",
                        cookie: klickaudSet.downloader_cookie,
                        "upgrade-insecure-requests": 1
                    }
                );
            });
        }
    });
}

function validateDownloaderTokenScdd(callback) {
    if (scdrSet.downloader_token === "" || utils.days_between(scdrSet.downloader_token_time, new Date()) > 5) {
        htmlWorker.getHtml("https://theseotools.net/soundcloud-downloader/playlist", (body, err, response) => {
            if (!err) {
                try {
                    scdrSet.downloader_token = "asd";
                    response.headers['set-cookie'].forEach((v) => {
                        if (scdrSet.downloader_cookie !== "") scdrSet.downloader_cookie += ";";
                        scdrSet.downloader_cookie += v.split(";")[0];
                    });
                    if (callback) callback();
                    //console.log(scdrSet);
                } catch (e) {
                    console.log(e);
                    if (callback) callback();
                }
            } else {
                console.log(err);
            }
        });
    } else {
        if (callback) callback();
    }
}

function validateDownloaderTokenKlick(callback) {
    if (klickaudSet.downloader_token === "" || utils.days_between(klickaudSet.downloader_token_time, new Date()) > 5) {
        htmlWorker.getHtml("https://www.klickaud.net/", (body, err, response) => {
            if (!err) {
                try {
                    let startStr = " <input type=\"hidden\" value='";
                    let endStr = "' name='";
                    let token = body.substr(body.indexOf(startStr));
                    klickaudSet.downloader_token = token.substr(startStr.length, token.indexOf(endStr) - startStr.length);


                    startStr = "' name='";
                    endStr = "'> <input ";
                    token = token.substr(token.indexOf(startStr));
                    klickaudSet.downloader_token1 = token.substr(startStr.length, token.indexOf(endStr) - startStr.length);

                    klickaudSet.downloader_token_time = new Date();
                    klickaudSet.downloader_cookie = "";

                    response.headers['set-cookie'].forEach((v) => {
                        if (klickaudSet.downloader_cookie !== "") klickaudSet.downloader_cookie += ";";
                        klickaudSet.downloader_cookie += v.split(";")[0];
                    });
                    if (callback) callback();
                } catch (e) {
                    console.log(e);
                    if (callback) callback();
                }

            } else {
                console.log(err);
            }
        });
    } else {
        if (callback) callback();
    }
}

export default function (url, callback) {//getData
    let img = null;
    let music = null;

    let musicCallback = (url, err) => {
        if (err) {
            callback(null, null, {url: url, type: "music", err: err});
            return;
        }

        music = url;
        if (img) callback(img, music);
    };


    let imgCallback = (url, err) => {
        if (err) {
            callback(null, null, {url: url, type: "img", err: err});
            return;
        }
        img = url;
        if (music) callback(img, music);
    };
    if ((url.indexOf && url.indexOf("/sets/") > 0) ||
        (url.pathname && url.pathname.indexOf("/sets/") > 0)) {
        getTracksUrls(url, musicCallback);
    } else {
        getMusicUrl(url, musicCallback);
    }

    htmlWorker.getHtml(url, (body, err) => {
        if (!err) {
            //fs.writeFile("data.html", body, () => {});
            getImgUrlAndUser(body, imgCallback);
        }
    });
}


