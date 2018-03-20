// this isn't great

const WebSocket = require('ws');
const fetch = require('node-fetch');

const wss = new WebSocket.Server({ port: 8080 });

let currentData = {};

wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

wss.on('connection', function connection(ws) {
  ws.send(JSON.stringify({ name: 'initial', data: currentData}));

  ws.on('message', function incoming(data) {
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });
});

function parseSchools(data) {
  const newData = {};
  data.Groups[0].Items.forEach(school => {
    newData[school.Name] = school.Voters;
  });

  return newData;
}

function getData() {
  return fetch('https://www.sussexstudent.com/svc/voting/stats/election/paramstats/118?groupIds=3&sortBy=itemname&sortDirection=ascending')
    .then(res => res.json())
}

function broadcastDiff() {
  getData()
    .then(data => {
      const diff = {};
      const currentSchoolsData = parseSchools(currentData);
      Object.entries(parseSchools(data)).forEach(([name, count]) => {
        const change = count - currentSchoolsData[name];

        if (change > 0) {
          diff[name] = change;
        }
      });

      currentData = data;
      if (Object.keys(diff).length > 0) {
        console.log(diff);
        wss.broadcast(JSON.stringify({ name: 'schoolChange', data: diff }));
      }
    })
    .catch(err => {
      console.log(err);
      throw err;
    })
}

setInterval(broadcastDiff, 3000);

getData().then(data => currentData = data);