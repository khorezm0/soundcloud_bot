import htmlWorker from "./htmlWorker.js";
import fs from "fs"
import utils from "./utils.js"

//DB:
import low from "lowdb";
import lodashId from 'lodash-id';
import FileSync from 'lowdb/adapters/FileSync'

const adapter = new FileSync('db.json');
const db = low(adapter);
db._.mixin(lodashId);
db.defaults({
    users: [],
    chats :[]
}).value();

//SC:
import SC from 'soundcloud-v2-api';

let id = "3UT1QkKC2kBqMLmSnbLbIps1suqeSlRs";
SC.init({
    clientId: id
});

let period = 60000 * 2;
let list = [];
let processor = () => {
};

let init = (updatesProcessor) => {

    if (!updatesProcessor) {
        console.log("There is no output in monitor, so no work");
        return;
    }

    processor = updatesProcessor;

    let hasUsers = db.has("users").value();

    if (hasUsers) {
        //console.log("subscribing users");
        let users = db.get('users')
            .cloneDeep()
            .value();

        for (let i in users) {
            _subscribe({url: users[i].url, chat: users[i].chat, lastCheck: new Date(users[i].lastCheck)});
        }
        console.log("subscribtion loaded from db");
    } else {
        console.log("no users");
    }
};

let getChats = ()=>{
    let hasUsers = db.has("users").value();

    if (hasUsers) {
        //console.log("subscribing users");
        let chats = db.get('chats')
            .cloneDeep()
            .value();
      return chats;
    } else {
      return [];
    }
};

let addChat = (chatId, displayName)=>{
  let chats = db.get("chats").find({chatId: chatId}).size().value();
  if (chats === 0) {
      try {
        db.get("chats")
            .push({chatId: chatId, displayName : displayName})
            .write();
        return true;
      } catch (e) {
          console.log(e);
      }
  } else {
      console.log("Уже добавлено");
  }
  return false;
};

let remChat = (chatId)=>{
  try{
    db.get('chats')
        .remove({ chatId: chatId })
        .write();
    return true;
  }catch(e){
    console.log(e);
  }
  return false;
};

let _subscribe = (infoData, callback) => {

    let data = {url: infoData.url, chat: infoData.chat, lastCheck: infoData.lastCheck};

    let testFail = (e) => {
        console.log(e);
        if (callback) callback(false);
    };

    let testOk = (permalink) => {
        //console.log("subscribed to "+permalink);
        let subscrId = setInterval(() => {

            let after = (e) => {
                data.lastCheck = new Date();
                db.get("users").find({url: data.url}).assign({url: data.url, lastCheck: data.lastCheck}).write();
            };

            checkUpdates(data, after, after);
        }, period);

        list.push({intervalId: subscrId, url: permalink});

        if (callback) callback(permalink);
    };

    checkUpdates(data, testOk, testFail);
};

let subscribe = function (data, callback) {
    data.lastCheck = new Date();
    _subscribe(data, (ok) => {
        if (ok) {
            let user = db.get("users").find({url: ok}).size().value();
            if (user === 0) {
                try {
                    db.get("users")
                        .push({url: ok, chat: data.chat})
                        .write();
                } catch (e) {
                    console.log(e);
                    if (callback) callback(false);
                    return;
                }
            } else {
                console.log("Уже добавлено");
            }
        }
        if (callback) callback(ok);
    })

};

let unsubscribe = function (url) {
  try{
    db.get('users')
        .remove({ url: url })
        .write();
    list.forEach((e)=>{
      clearInterval(e.intervalId);
    });
    let users = db.get('users')
            .cloneDeep()
            .value();

        for (let i in users) {
            _subscribe({url: users[i].url, chat: users[i].chat, lastCheck: new Date(users[i].lastCheck)});
        }
      return true;
    }catch(e){console.log(e);}
    return false;
};

let checkUpdates = (data, resolve, reject) => {

    // распознаем верную ссылку
    SC.get(`/resolve`, {
        url: data.url
    })
        .then(result1 => {
            //fs.writeFile("data.json", utils.cleanStringify(result), ()=>{});
            // это точно прользователь?
            if (result1.kind && result1.kind === "user") {
                //console.log("Checking!");
                SC.get(`/users/${result1.id}/playlists`, {
                    q: 'Post',
                    limit: 5
                }).then(result => {
                    //fs.writeFile("data.json", utils.cleanStringify(result), ()=>{});
                    // норм
                    try {
                        if (result.collection) {
                            result.collection.forEach((e) => {
                                //console.log(new Date(e.created_at) - data.lastCheck);
                                if (new Date(e.created_at) - data.lastCheck > 0) {
                                    send(e.permalink_url, data.chat);// отправляем епта
                                }
                            });
                        }
                    } catch (e) {
                        console.log("Not my problem");
                        if (reject) reject(e);
                        return;
                    }
                    if (resolve) resolve(result1.permalink_url);
                }).catch((e) => {
                    if (reject) reject(e);
                });
                SC.get(`/users/${result1.id}/tracks`, {
                    q: 'Post',
                    limit: 5
                }).then(result => {
                    //fs.writeFile("data.json", utils.cleanStringify(result), ()=>{});
                    // норм
                    try {
                        if (result.collection) {
                            result.collection.forEach((e) => {
                                //console.log(new Date(e.created_at) - data.lastCheck);
                                if (new Date(e.created_at) - data.lastCheck > 0) {
                                    send(e.permalink_url, data.chat);// отправляем епта
                                }
                            });
                        }
                    } catch (e) {
                        console.log("Not my problem");
                        if (reject) reject(e);
                        return;
                    }
                    if (resolve) resolve(result1.permalink_url);
                }).catch((e) => {
                    if (reject) reject(e);
                });
            } else {
                if (reject) reject("It's not a user! Kind: " + result1.kind);
            }

        }).catch((e) => {
        if (reject) reject(e);
    });
};

let send = (url, chat) => {
    processor(url, chat);
};

let getList = ()=>{
  let hasUsers = db.has("users").value();

    if (hasUsers) {
        let users = db.get('users')
            .cloneDeep()
            .value();
        let arr = [];
        for (let i in users) {
            //_subscribe({url: users[i].url, chat: users[i].chat, lastCheck: new Date(users[i].lastCheck)});
            arr.push({url:users[i].url,  lastCheck: new Date(users[i].lastCheck)});
        }
      return arr;
    } else {
      return [];
    }
};

export default {
  init: init,
  subscribe: subscribe,
  unsubscribe: unsubscribe,
  getList:getList,
  
  getChats : getChats,
  addChat : addChat,
  remChat : remChat
};