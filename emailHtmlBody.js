function getHtmlBody(teamContestsDetails, registeredContestsDetails) {
  let teamContestsBody = getTable(teamContestsDetails, "Team Contests");
  let registerContestsBody = getTable(
    registeredContestsDetails,
    "Registered Contests"
  );

  const body = `<!DOCTYPE html>
  <html>
  
    <body style="margin: 0; width: 100%; text-align: center; font-family: 'Arial'; align-content: center;">
        <h1>Codeforces Contests</h1>
    
        ${registerContestsBody}
  
        ${teamContestsBody}
  </body>
  
  </html>`;

  return body;
}

function getTable(contestsDetails, title) {
  if (contestsDetails.length == 0) {
    return "";
  }

  let contestsBody = `
  <div style="display: block ; text-align: left; padding-left: 20px; font-size: 1.5em; letter-spacing: 0.10em; padding: 15px 15px;" align="left"><u style="padding: 15px 15px;">${title}</u></div>
    <table style="box-sizing: border-box; width: 85%; background: rgb(53, 53, 53); border-radius: 20px; font-family: 'Roboto', 'Arial'; border-spacing: 0; margin: 40px 0; margin-left: auto; margin-right: auto;" width="85%">
        <thead style="padding: 15px 15px;">
            <tr style="padding: 15px 15px;">
                <th style="padding: 15px 15px; font-size: 15px; padding-top: 20px; padding-bottom: 20px; font-size: 16px; letter-spacing: 1px; color: rgb(25, 162, 180);">Contest Id</th>
                <th style="padding: 15px 15px; font-size: 15px; padding-top: 20px; padding-bottom: 20px; font-size: 16px; letter-spacing: 1px; color: rgb(25, 162, 180);">Contest Name</th>
                <th style="padding: 15px 15px; font-size: 15px; padding-top: 20px; padding-bottom: 20px; font-size: 16px; letter-spacing: 1px; color: rgb(25, 162, 180);">Time</th>
            </tr>
        </thead>
        <tbody style="padding: 15px 15px;">
    `;

  contestsDetails.forEach((contestDetails) => {
    contestsBody += getContestBody(contestDetails);
  });

  if (contestsDetails.length != 0)
    contestsBody += `
        </tbody>
    </table>`;

  return contestsBody;
}

function getContestBody(contestDetails) {
  return `
    <tr style="padding: 15px 15px; font-size: 15px; line-height: 1.2; letter-spacing: 0.5px; background-color: white; color: #5a5a5a;" bgcolor="white">
        <td style="padding: 15px 15px;">${contestDetails.id}</td>
        <td style="padding: 15px 15px;">${contestDetails.name}</td>
        <td style="padding: 15px 15px;">${contestDetails.time}</td>
    </tr>
      `;
}

module.exports = getHtmlBody;
