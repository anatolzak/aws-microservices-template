const server = Bun.serve({
  port: 80,
  fetch(request) {
    return Response.json({ service: 'users' });
  },
});

console.log(`Listening on localhost:${server.port}`);
