import Telegraf from "telegraf";
import extra from "telegraf/extra";
import soundcloud from "./soundcloud-parser.js";
import URL from "url";
import monitor from "./monitor.js";

let urlsParse = textUrl => {
  let url = URL.parse(textUrl);
  return (
    url.host &&
    (url.host === "soundcloud.com" || url.host === "m.soundcloud.com") &&
    url.pathname
  );
};

let botStart = () => {
  const bot = new Telegraf(process.env.SECRET);
  let receiveChats = [];

  let getData = (message, clbk) => {
    try {
      console.log(message);
      let url = urlsParse(message);
      if (!url) {
        clbk(
          null,
          null,
          "Wrong URL! Example: https://soundcloud.com/damenace186/da-menace-chevy-thang"
        );
        return;
      }

      let urltext = message;
      let ind = urltext.indexOf("?");
      if (ind > 0) {
        urltext = urltext.substr(0, ind);
      }

      soundcloud(urltext, clbk);
    } catch (e) {
      console.log(e);
      clbk("Wrong URL!");
    }
  };

  bot.on("message", ctx => {
    let message = ctx.message.text;

    if (!message || message.trim().length === 0) {
      ctx.reply(
        "Wrong URL! Example: https://soundcloud.com/damenace186/da-menace-chevy-thang",
        extra.webPreview(false)
      );
      return;
    }

    if (message.toLowerCase().startsWith("/start")) {
      ctx.reply("Hello! Send me URL!");
      return;
    }

    if (message.startsWith("/")) {
      
      //MONITOR-SUBSCRIBE
      if (message.startsWith("/monitor")) {
        let args = message.split(" ");
        if (args.length < 2) {
          ctx.reply("Error! No URLS founded");
        } else {
          for (let i in args) {
            if(args[i] == "/monitor") continue;
            
            if (urlsParse(args[i])) {
              let url = args[i];
              url = url.replace("m.soundcloud.com/", "soundcloud.com/");

              try {
                ctx
                  .getChat()
                  .then(result => {
                    monitor.subscribe({ url: url, chat: result.id });
                    ctx.reply("Subscribed to " + url, extra.webPreview(false));
                  })
                  .catch(e => {
                    ctx.reply(
                      "Error subscribing to " + url,
                      extra.webPreview(false)
                    );
                    console.log(e);
                  });
              } catch (e) {
                ctx.reply(
                  "Error subscribing to " + url,
                  extra.webPreview(false)
                );
                console.log(e);
              }
            } else {
              ctx.reply("Wrong URL: " + args[i], extra.webPreview(false));
            }
          }
        }
      }
      //MONITOR-LIST
      else if (message.startsWith("/list")) {
        let arr = monitor.getList();
        let i = 1;
        arr.forEach(x => {
          let txt = `${i}) ${x.url} ${x.lastCheck.toLocaleTimeString()} \n`;
          ctx.reply(txt, extra.webPreview(false));
          i++;
        });
      }
      //MONITOR-DELETE
      else if (message.startsWith("/delete")) {
        let args = message.split(" ");
        if (args.length < 2) {
          ctx.reply("Error! No URLS founded");
        } else {
          args.forEach(u => {
            if (u === "/delete") return;
            if (monitor.unsubscribe(u))
              ctx.reply("Отписан от " + u, extra.webPreview(false));
            else ctx.reply("Неверная ссылка " + u, extra.webPreview(false));
          });
        }
      }
      //MONITOR-CHATS
      else if (message.startsWith("/chats")) {
        let arr = monitor.getChats();
        let i = 1;
        arr.forEach(x => {
          let txt = `${i}) ${x.displayName} ${x.chatId}`;
          ctx.reply(txt, extra.webPreview(false));
          i++;
        });
      }
      //MONITOR-CHATS-ADD
      else if (message.startsWith("/receive")) {
        bot
          .telegram
          .getChat(ctx.message.chat.id)
          .then(chat => {
            let name = chat.username;
            if (!name || name.trim().length == 0) name = chat.first_name;
            if (!name || name.trim().length == 0) name = chat.last_name;
            let ret = monitor.addChat(ctx.message.chat.id, name);

            receiveChats = monitor.getChats();

            if (ret) ctx.reply("Вы подписаны на обновления!");
            else ctx.reply("Неизвестная ошибка!");
          })
          .catch(e => {
            ctx.reply("Неизвестная ошибка!");
            console.log(e);
          });
      }
      //MONITOR-CHATS-REM
      else if (message.startsWith("/noreceiving")) {
        bot
          .telegram
          .getChat(ctx.message.chat.id)
          .then(chat => {
            let name = chat.username;
            if (!name || name.trim().length == 0) name = chat.first_name;
            if (!name || name.trim().length == 0) name = chat.last_name;
            let ret = monitor.remChats(ctx.message.chat.id);

            receiveChats = monitor.getChats();

            if (ret) ctx.reply("Вы отписаны от обновлений!");
            else ctx.reply("Неизвестная ошибка!");
          })
          .catch(e => {
            ctx.reply("Неизвестная ошибка!");
            console.log(e);
          });
      }
      return;
    }
    let reject = reason => {
      console.log(reason);
      ctx.reply("Internal error!");
    };

    let url = message;
    url = url.replace("m.soundcloud.com/", "soundcloud.com/");

    getData(url, (info, music, err) => {
      if (err) {
        if (err.type) ctx.reply("Error getting " + err.type);
        else ctx.reply(err, extra.webPreview(false));
        console.log(err);
      } else {
        ctx
          .replyWithMediaGroup([
            {
              media: info.img,
              type: "photo",
              caption: info.user
            }
          ])
          .catch(reject);

        if (!Array.isArray(music)) {
          ctx
            .replyWithAudio({
              url: music.url,
              filename: music.name,
              performer: music.performer,
              title: music.name
            })
            .catch(reject);
        } else
          music.forEach(m => {
            ctx
              .replyWithAudio({
                url: m.url,
                filename: m.name,
                title: m.name,
                performer: m.performer
              })
              .catch(reject);
          });
      }
    });
  });
  bot.launch().catch(reason => {
    console.log("Error! " + reason);
  });
  monitor.init((url, sub) => {
    //bot.telegram.sendAudio(user, );

    receiveChats.forEach(chatInfo => {
      let chat = chatInfo.chatId;
      let reject = reason => {
        console.log(reason);
        bot.telegram.sendMessage(chat, "Internal error!");
      };

      getData(url, (info, music, err) => {
        if (err) {
          if (err.type)
            bot.telegram.sendMessage(chat, "Error getting " + err.type);
          else bot.telegram.sendMessage(chat, err, extra.webPreview(false));
          console.log(err.err);
        } else {
          bot.telegram
            .sendMediaGroup(chat, [
              {
                media: info.img,
                type: "photo",
                caption: info.user
              }
            ])
            .catch(reject);

          if (!Array.isArray(music)) {
            bot.telegram
              .sendAudio(chat, {
                url: music.url,
                filename: music.name
              })
              .catch(reject);
          } else
            music.forEach(m => {
              bot.telegram
                .sendAudio(chat, { url: m.url, filename: m.name })
                .catch(reject);
            });
        }
      });
    });
  });

  receiveChats = monitor.getChats();
};

botStart();

// monitor.init((url, chat)=>{
//     console.log("update: "+url);
// });

// monitor.subscribe({url:"https://soundcloud.com/akmal-kamalov-271833550", chat:"user1"}, (ok)=>{
//     console.log("Ready "+ok);
// });

//soundcloud("https://soundcloud.com/ynwmelly/suicidal",(info, music, err) => {
// soundcloud("https://soundcloud.com/ynwmelly/sets/melly-vs-melvin",(info, music, err) => {
//     if (err) {
//         console.log(err.err);
//     } else {
//         console.log(info);
//         console.log(music);
//     }
// });
