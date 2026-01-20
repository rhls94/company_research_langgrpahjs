#!/bin/bash
echo "Starting Node.js Backend..."
cd node-backend
nohup node src/app.js > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID $BACKEND_PID"

echo "Starting Frontend..."
cd ../ui
npm run dev &
FRONTEND_PID=$!
echo "Frontend started with PID $FRONTEND_PID"

echo "Application running!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop."

trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM
wait
