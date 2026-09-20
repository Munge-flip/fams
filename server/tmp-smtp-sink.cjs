/* Throwaway SMTP sink: accepts mail on 127.0.0.1:2525 and records it (delete after use). */
const net = require('net');
const fs = require('fs');

const outFile = process.argv[2] || 'smtp-inbox.json';
const messages = [];

const server = net.createServer((socket) => {
  let buffer = '';
  let inData = false;
  let current = { from: '', to: [], data: '' };

  socket.write('220 fams-sink ESMTP ready\r\n');
  socket.on('error', () => {});

  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');

    let index = buffer.indexOf('\r\n');
    while (index !== -1) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      index = buffer.indexOf('\r\n');

      if (inData) {
        if (line === '.') {
          inData = false;
          messages.push(current);
          fs.writeFileSync(outFile, JSON.stringify(messages, null, 2));
          console.log(`delivered ${current.to.join(', ')} (${current.data.length} bytes)`);
          current = { from: '', to: [], data: '' };
          socket.write('250 2.0.0 Ok: queued\r\n');
        } else {
          current.data += `${line}\n`;
        }
        continue;
      }

      const upper = line.toUpperCase();
      if (upper.startsWith('EHLO') || upper.startsWith('HELO')) {
        socket.write('250-localhost\r\n250 SIZE 10485760\r\n');
      } else if (upper.startsWith('MAIL FROM')) {
        current.from = line.slice(line.indexOf(':') + 1).trim();
        socket.write('250 2.1.0 Ok\r\n');
      } else if (upper.startsWith('RCPT TO')) {
        current.to.push(line.slice(line.indexOf(':') + 1).trim());
        socket.write('250 2.1.5 Ok\r\n');
      } else if (upper === 'DATA') {
        inData = true;
        socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
      } else if (upper === 'QUIT') {
        socket.write('221 2.0.0 Bye\r\n');
        socket.end();
      } else {
        socket.write('250 2.0.0 Ok\r\n');
      }
    }
  });
});

server.listen(2525, '127.0.0.1', () => console.log('SMTP sink listening on 127.0.0.1:2525'));
