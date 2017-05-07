const ProgressParser = require("../../src/js/Scan").ProgressParser;



const progessParser = new ProgressParser();

progessParser.on('data', data => {
  console.log("have %d", data);
});

progessParser.write("Progress: 15.0%\r");
progessParser.write("Progress: 70.0%\rProgress: 80.0%\r");
progessParser.write("Progress: \r");
progessParser.write("90.0%\rProgress");
progessParser.write(": 100.0%");
progessParser.end();
