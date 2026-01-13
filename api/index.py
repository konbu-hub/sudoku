import os
import sys

# Add the parent directory to sys.path so we can import app and other modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app import app
