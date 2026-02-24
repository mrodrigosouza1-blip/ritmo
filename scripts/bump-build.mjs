import fs from "fs";

const path = "./app.json";
const raw = fs.readFileSync(path, "utf-8");
const data = JSON.parse(raw);

if (!data.expo.ios) data.expo.ios = {};
if (!data.expo.android) data.expo.android = {};

const currentIOS = parseInt(data.expo.ios.buildNumber || "0", 10);
const currentAndroid = parseInt(data.expo.android.versionCode || 0, 10);

data.expo.ios.buildNumber = String(currentIOS + 1);
data.expo.android.versionCode = currentAndroid + 1;

fs.writeFileSync(path, JSON.stringify(data, null, 2));

console.log("✅ iOS buildNumber:", data.expo.ios.buildNumber);
console.log("✅ Android versionCode:", data.expo.android.versionCode);
