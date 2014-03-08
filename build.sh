#!/bin/bash

OLDDIR=$(pwd)

echo Mac Build
mkdir -p "./build/RS Manager.app/"

cp -r ./resources/node-webkit.app/Contents "./build/RS Manager.app/"

mkdir -p "./build/RS Manager.app/Contents/Resources/app.nw/"

cp -r ./rsmanager.nw/* "./build/RS Manager.app/Contents/Resources/app.nw"
cp -r ./node_modules "./build/RS Manager.app/Contents/Resources/app.nw"
cp ./rsmanager.nw/icon.icns "./build/RS Manager.app/Contents/Resources/app.icns"
cp ./rsmanager.nw/Info.plist "./build/RS Manager.app/Contents/Info.plist"

echo Windows Build

rm "./build/rsmanager.zip.nw"
cd rsmanager.nw
zip -r "../build/rsmanager.zip.nw" *
cd $OLDDIR
zip -r "./build/rsmanager.zip.nw" node_modules/

mkdir -p "./build/RS Manager (Win32)/"

cat ./resources/node-webkit-win32/nw.exe "./build/rsmanager.zip.nw" > "./build/RS Manager (Win32)/rsmanager.exe"
cp ./resources/node-webkit-win32/*.dll "./build/RS Manager (Win32)/"


echo "Windows Build (Client)"

rm -rf "./build/RS Client (Win32)/"
mkdir -p "./build/RS Client (Win32)/"
cp -r ./resources/rsclient-tools-win32/* "./build/RS Client (Win32)/"
cp -r ./rsclient/* "./build/RS Client (Win32)/"
cp -r ./node_modules "./build/RS Client (Win32)/"


