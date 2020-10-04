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

const user = {
  handleOrEmail: process.env.USERNAME,
  password: process.env.PASSWORD,
};

let session = {
  csrf_token: null,
  cookie: null,
};

let notRegContestId = [];

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

console.log("Welcome to Codeforces Automated Register");

// sendEmail("Testing the app","Hello from Codeforces Login Server",Email)

// setInterval(() => {
main();
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

      // console.log(session)
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

  return axios(options)
    .then((res) => {
      const $ = cheerio.load(res.data);

      const contestDivs = $("a.red-link");

      let contestsDetails = [];

      contestDivs.each((_, contest) => {
        const contestLink = contest["attribs"]["href"];
        const contestId = contestLink.split("/")[2];

        if (notRegContestId.includes(contestId)) {
          return;
        }

        const contestRow = $(`tr[data-contestid=${contestId}] td`);

        const contestName = $(contestRow["0"]).text().trim();
        const contestTime = getLocalTime($(contestRow["2"]).text().trim());

        const contestDetails = {
          id: contestId,
          link: contestLink,
          name: contestName,
          time: contestTime,
        };

        contestsDetails.push(contestDetails);

        console.log(contestDetails);
      });

      console.log(contestsDetails);

      contestsDetails.forEach((contestDetails) => {
        checkContest(contestDetails);
      });
    })
    .catch((error) => handlerError(error));
}

// TODO: Check for individual and team contests
async function checkContest(contestDetails) {
  const contestRegUrl = baseUrl + contestDetails.link;

  console.log(contestRegUrl);

  const options = {
    method: "get",
    url: contestRegUrl,
    headers: {
      Cookie: session.cookie,
    },
  };

  let rejectedContestBody = []
  let registeredContestBody = []

  return axios(options).then((res) => {
    const $ = cheerio.load(res.data);

    const takePartAs = $("input#takePartAsTeamInput");

    // if (takePartAs.length != 0) {
    //   notRegContestId.push(contestDetails.id);
    //   handleTeamContest(contestDetails);
    // } else {
      registerContest(contestDetails);
    // }
  });
}

function handleTeamContest(contestDetails) {
}

// TODO: Send Email after registration
async function registerContest(contestDetails) {
  const contestRegUrl = baseUrl + contestDetails.link;

  console.log(contestRegUrl);

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
    url: contestRegUrl,
    headers: {
      ...form.getHeaders(),
      Cookie: session.cookie,
    },
    data: form,
  };

  axios(options)
    .then(function (res) {
      const $ = cheerio.load(res.data)
      
      if($("input[name=takePartAs]").length != 0) {
        
      }

      console.log(`Registered successfully to contest ${contestDetails.link}!!!`);
    })
    .catch(function (error) {
      handlerError(error);
    });
}

function sendEmail(subject, body, email) {
  const data = {
    from: "Codeforces Stats <status@avinish.me>",
    to: email,
    subject: subject,
    text: body,
  };
  EMAIL_mg.messages().send(data, function (error, body) {
    if (error) {
      handlerError(error);
    } else {
      console.log(
        `Mail with subject "${subject}" sent successfully to ${email}`
      );
    }
  });
}

function getLocalTime(contestTime) {
  const [date, time] = contestTime.split(" ");
  const [hours, minutes] = time.split(":");
  const [month, day, year] = date.split("/");

  const monthIndex = months.findIndex((storedMonth) => storedMonth == month);
  // console.log(hours, minutes, month, date, year, monthIndex);

  var localTime = new Date(year, monthIndex, day, hours, minutes, 0, 0);
  localTime.setHours(localTime.getHours() + 2);
  localTime.setMinutes(localTime.getMinutes() + 30);

  return localTime.toString();
}

function handlerError(error) {
  console.log("Got an error.");
  console.log(error);
}

// http
//   .createServer(function (req, res) {
//     console.log("Server is listening to PORT: " + PORT);
//     res.writeHead(200, { "Content-Type": "text/plain" });
//     res.write("Hello World!");
//     res.end();
//   })
//   .listen(PORT);
