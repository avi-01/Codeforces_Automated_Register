const axios = require("axios");
const cheerio = require("cheerio");
const qs = require("querystring");
const FormData = require("form-data");
const http = require("http");
const mailgun = require("mailgun-js");
const emailHtmlBody = require("./emailHtmlBody")

const PORT = process.env.PORT || 5000;

const baseUrl = "https://codeforces.com";
const Email = "avnishmay@gmail.com" || process.env.EMAIL;
const EMAIL_DOMAIN = process.env.DOMAIN_NAME;
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

let teamContestId = [];

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

main()

setInterval(() => {
main();
}, 1000 * 60 * 2);

async function main() {
  await getCsrfAndJid();

  await login();

  getContests();
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

async function getContests() {
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
      });

      console.log("ContestDetails:- " + contestsDetails);

      checkContest(contestsDetails);
    })
    .catch((error) => handlerError(error));
}

async function checkContest(contestsDetails) {
  const oldNotRegContestId = [...teamContestId];
  teamContestId = [];

  let teamContestsDetail = [];
  let registeredContestsDetails = [];

  let contestsRegPromise = [];

  contestsDetails.forEach((contestDetails) => {
    if (oldNotRegContestId.includes(contestDetails.id)) {
      teamContestId.push(contestDetails.id);
      return;
    }

    const contestRegUrl = baseUrl + contestDetails.link;

    console.log(contestRegUrl);

    const options = {
      method: "get",
      url: contestRegUrl,
      headers: {
        Cookie: session.cookie,
      },
    };

    const contestRegPromise = axios(options)
      .then(async (res) => {
        const $ = cheerio.load(res.data);
        const takePartAs = $("input#takePartAsTeamInput");

        if (takePartAs.length != 0) {
          const teamContestBody = handleTeamContest(contestDetails);
          teamContestsDetail.push(teamContestBody);
        } else {
          const registeredContestBody = await registerContest(contestDetails);
          if (registeredContestBody)
            registeredContestsDetails.push(registeredContestBody);
        }
      })
      .catch((error) => {
        handlerError(error);
      });

    contestsRegPromise.push(contestRegPromise);
  });

  await Promise.all(contestsRegPromise);

  console.log("TeamContest Detail:- " + teamContestsDetail);
  console.log("RegisterContest Detail:- " + registeredContestsDetails);

  prepareEmail(teamContestsDetail, registeredContestsDetails);
}

function handleTeamContest(contestDetails) {
  teamContestId.push(contestDetails.id);

  return contestDetails;
}

async function registerContest(contestDetails) {
  const contestRegUrl = baseUrl + contestDetails.link;

  console.log("RegisterContest:- " + contestRegUrl);

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

  return axios(options)
    .then(function (res) {
      const $ = cheerio.load(res.data);

      if ($("input[name=takePartAs]").length != 0) {
        console.log(
          `Registration fail for the contest ${contestDetails.name}!!!`
        );
        return null;
      }

      console.log(
        `Registered successfully to contest ${contestDetails.name}!!!`
      );

      return contestDetails;
    })
    .catch(function (error) {
      handlerError(error);
    });
}

function prepareEmail(teamContestsDetail, registeredContestsDetails) {
  if (teamContestsDetail.length == 0 && registeredContestsDetails.length == 0) {
    return;
  }

  const subject = "Codeforces Contests";

  const body = emailHtmlBody(teamContestsDetail, registeredContestsDetails);

  // console.log(body)

  sendEmail(subject, body, Email);
}

function sendEmail(subject, body, email) {
  const data = {
    from: "Codeforces Stats <stats@mail.avinish.me>",
    to: email,
    subject: subject,
    html: body,
  };
  EMAIL_mg.messages().send(data, function (error, body) {
    if (error) {
      handlerError(error);
    } else {
      console.log(
        `Mail with subject "${subject}" sent successfully to ${email}`
      );
      // console.log(body);
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

  var stringTime = `${localTime.getHours()}:${localTime.getMinutes()} ${localTime.getDate()}/${
    months[localTime.getMonth()]
  }/${localTime.getFullYear()}`;

  return stringTime;
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
