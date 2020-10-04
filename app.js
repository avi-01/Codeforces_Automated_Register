const axios = require("axios");
const cheerio = require("cheerio");
const qs = require("querystring");
const FormData = require("form-data");
const http = require("http");
const mailgun = require("mailgun-js");

const PORT = process.env.PORT || 5000;

const baseUrl = "https://codeforces.com";
const Email = process.env.EMAIL;
const EMAIL_DOMAIN = "mail.avinish.me";
const EMAIL_mg = mailgun({
  apiKey: process.env.MAILGUN_APIKEY,
  domain: EMAIL_DOMAIN,
});


// TODO: Add user data in process env.
const user = {
  handleOrEmail: process.env.USERNAME,
  password: process.env.PASSWORD,
};

let session = {
  csrf_token: null,
  cookie: null,
};

console.log("Welcome to Codeforces Automated Register");


sendEmail("Testing the app","Hello from Codeforces Login",Email)

// setInterval(() => {
//   main();
// }, 1000 * 60 * 2);

async function main() {
  await getCsrfAndJid();

  await login();

  await registerContests();
}

function getCsrfAndJid() {
  return axios
    .get(baseUrl + "/enter")
    .then((res) => {
      session.cookie = res["headers"]["set-cookie"][0].split(";")[0];

      const $ = cheerio.load(res.data);
      session.csrf_token = $("meta[name='X-Csrf-Token']")[0].attribs["content"];
    })
    .catch((err) => {
      handlerError(err);
    });
}

function login() {
  console.log("Logging...");
  const url = baseUrl + "/enter";

  const options = {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Cookie: session.cookie,
    },
  };

  const data = {
    ...user,
    csrf_token: session.csrf_token,
    action: "enter",
  };

  return axios
    .post(url, qs.stringify(data), options)
    .then((res) => {
      const $ = cheerio.load(res.data);
      const userId = $($(".lang-chooser a")[2]).html();

      session.csrf_token = $("meta[name='X-Csrf-Token']")[0].attribs["content"];

      console.log(`Login Successful. Welcome ${userId}!!!`);
    })
    .catch((err) => {
      handlerError(err);
    });
}

async function registerContests() {
  const contestsUrl = baseUrl + "/contests";

  const options = {
    method: "get",
    url: contestsUrl,
    headers: {
      Cookie: session.cookie,
    },
  };

  return axios(options).then((res) => {
    const $ = cheerio.load(res.data);

    const contestDivs = $("a.red-link");

    let contestRegLinks = [];

    contestDivs.each((_, contest) => {
      contestRegLinks.push(contest["attribs"]["href"]);
    });

    contestRegLinks.forEach((contestLink) => {
      registerContest(contestLink);
    });
  });
}

async function registerContest(contestLink) {
  const contestUrl = baseUrl + contestLink;

  console.log(contestUrl);

  const data = {
    csrf_token: session.csrf_token,
    action: "formSubmitted",
    takePartAs: "personal",
  };

  const form = new FormData();
  form.append("action", "formSubmitted");
  form.append("csrf_token", session.csrf_token);
  form.append("takePartAs", "personal");
  form.append("_tta", "555");

  const options = {
    method: "POST",
    url: contestUrl,
    headers: {
      ...form.getHeaders(),
      Cookie: session.cookie,
    },
    data: form,
  };

  // axios(options)
  //   .then(function (res) {
  //     console.log(`Registered successfully to contest ${contestLink}!!!`);
  //   })
  //   .catch(function (error) {
  //     handlerError();
  //   });
}


function sendEmail(subject, body, email) {
  const data = {
    from: "Stats <status@avinish.me>",
    to: email,
    subject: subject,
    text: body,
  };
  EMAIL_mg.messages().send(data, function (error, body) {
    if (error) {
      handlerError(error);
    } else {
      console.log(`Mail with subject "${subject}" sent successfully to ${email}`);
      console.log(body);
    }
  });
}

function handlerError(error) {
  console.log("Got an error.");
  console.log(error);
}

http
  .createServer(function (req, res) {
    console.log("Server is listening to PORT: " + PORT);
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.write("Hello World!");
    res.end();
  })
  .listen(PORT);
