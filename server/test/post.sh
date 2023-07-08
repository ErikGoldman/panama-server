#!/bin/bash

curl -X POST -H "Content-Type: application/json" --data "@$1" http://localhost:3000/batch