#!/bin/bash

# Ask for commit message
echo "Enter your commit message:"
read message

# Git automation
git add .
git commit -m "$message"
git push origin main

echo "✅ Code pushed successfully to GitHub!"
