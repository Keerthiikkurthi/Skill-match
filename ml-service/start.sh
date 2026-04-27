#!/bin/bash
# Start the ML service
cd "$(dirname "$0")"

# Create and activate virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate

# Install dependencies
pip install -r requirements.txt --quiet

# Start the service
echo "Starting Resume Analyzer ML Service on port 8000..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
