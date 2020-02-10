import URL from "url";
let request = require('request');
request = request.defaults({jar: true});

export default {
    getHtml : (url_string, callback, post, headers) => {

        let params = {
            url: url_string,
            method: "GET",
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36'
            }
        };

        if (post) {
            params.headers['content-type'] = 'application/x-www-form-urlencoded';
            params.method = "POST";
            params.postData = post;
        }

        if (headers) {
            let heads = headers;
            if (!heads.forEach) {
                heads = Object.entries(heads);
                heads.forEach((x) => {
                    params.headers[x[0]] = x[1];
                });
            } else {
                heads.forEach((x, id) => {
                    params.headers[id] = x;
                });
            }
            //console.log(headers);
            //delete params.postData.headers;
        }

        let response = (err, res, body) => {
            if (err) {
                if (callback) callback(null, err, res);
                console.log(err);
                return;
            }
            //console.log("hasResponse");
            //console.log(res);
            if (callback) callback(body, null, res);
        };

        if (params.method === "POST") {
            request.post(
                {
                    url: params.url,
                    form: params.postData,
                    headers: params.headers
                }
                , response);

        } else {
            request(
                {
                    url: url_string,
                    headers: params.headers,
                }, response);
        }
    }
}
;
