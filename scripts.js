let currentTest = "";

let optIn = true;

async function Java_Main_jsAlert(lib, message) {
    alert(message);
}

async function Java_Main_updateConsole(lib, message) {
    updateOutput(message);
}

async function Java_Main_registerTestResult(lib, testName, passed, feedback) {
    showTestResult(testName, passed);
    const testSpan = document.getElementById(testName);
    if (testSpan != null){

        //todo: consider neutral

        if (passed){
            testSpan.classList.add("pass");
            testSpan.classList.remove("fail");
        } else {
            testSpan.classList.add("fail");
            testSpan.classList.remove("pass");
        }

    }

    updateSectionTestCounts();

    notifyAPI(testName, true, passed, feedback);
}

function updateSectionTestCounts(){

    const sectionIds = ["fields", "constructor", "accessors", "mutators", "additional", "additionalGetter", "additionalMethods"];

   for (let i = 0; i < sectionIds.length; i++) {
    const sectionId = sectionIds[i];
    const details = document.getElementById(sectionId);
    if (details == null){
        console.log(sectionId);
        continue;
    }
    
    const testDescription = passedTestsForElement(details);
    const header = details.getElementsByTagName("h3")[0];
    if (header.innerText.endsWith(')')){
        header.innerText = header.innerText.substring(0,header.innerText.length-6) + " " + testDescription;
    } else {
        header.innerText = header.innerText + " " + testDescription;
    }
}
}

/**
 * Counts the number of elements with the class test and those that also have the class pass
 * Results a string showing the ratio, e.g. (2/3)
 * @param {Element} element 
 * @returns {String} text showing the passing test
 */
function passedTestsForElement(element){
    const tests = element.getElementsByClassName("test");
    var passCount = 0;
    for (let i = 0; i < tests.length; i++) {
        if (tests[i].classList.contains("pass")){
            passCount++;
        }
    }
    return `(${passCount}/${tests.length})`;
}


/**
 * Takes the code from the 'code' textarea and writes it to a text file Java can see
 */
async function addStringFileToCheerpJ() {
    const fileName = "LibraryBook.java";
    //const content = document.getElementById("code").value; //use .value for textarea
    const content = editor.getValue();
    try {
        await cheerpOSAddStringFile("/str/" + fileName, content);
        console.log(`File "${fileName}" added to /str/.`);
    } catch (e) {
        alert('Error adding file to /str/: ${e.message}');
        console.error("Error writing file to /str/:", e);
    }
}

async function compile() {
    //parameter format: class name, class path, args passed to Main
    //args passed to main are location of file to compile, the specifier for the directory and the directory for output
    //await cheerpjRunMain("com.sun.tools.javac.Main", "/app/tools.jar:/files/", "/str/LibraryBook.java", "-d", "/files/")
    const exitCode = await cheerpjRunMain("com.sun.tools.javac.Main", "/app/tools.jar", "/str/LibraryBook.java", "-d", "/files/")
    return exitCode == 0;
}


let markers = new Set();

//adapted from https://stackoverflow.com/questions/11403107/capturing-javascript-console-log
(function() {
    const oldLog = console.log;
    console.log = function(message) {
        oldLog.apply(this,arguments);
        //handle compilation errors
        if (message.startsWith("/str/LibraryBook.java:")){
            const error = message.substring(22);
            updateOutput("\nCompilation error on line " + error);
            
            const line = error.substring(0, error.indexOf(" ")-1);

            var Range = ace.require("ace/range").Range
            const marker = editor.getSession().addMarker(new Range(line-1, 0, line-1, 20), "lineHighlighter", "fullLine");
            markers.add(marker);

            notifyAPI(currentTest, false, false, error);

        }
    }
})()




function removeLineMarkers(){
    for (const marker of markers){
        editor.getSession().removeMarker(marker);
    }
    markers.clear();
}


cheerpjInit({
    version: 8,
    natives: { Java_Main_jsAlert, Java_Main_updateConsole, Java_Main_registerTestResult }
} //needed to allow Java to call JS functions
).then(() => {
    console.log("CheerpJ initialized");
}).catch((error) => {
    console.error("Error initializing CheerpJ:", error);
    alert("Failed to initialize CheerpJ: " + error.message);
});


/**
 * Updates a named test in the list to show pass/fail status
 * @param {the name of the test} testName 
 * @param {whether the test passed} passed 
 */
function showTestResult(testName, passed) {
    let testList = document.getElementById("test");
    for (let i = 0; i < testList.length; i++) {
        let option = testList.options[i];

        if (option.value == testName) {

            const passedSymbol = passed ? "🟢" : "🔴";
            if (option.innerHTML.startsWith("🟢")) {
                option.innerHTML = option.innerHTML.substring("🟢".length);
            }
            if (option.innerHTML.startsWith("🔴")) {
                option.innerHTML = option.innerHTML.substring("🔴".length);
            }
            option.innerHTML = passedSymbol + option.innerHTML;
        }
    }
}


function updateOutput(message) {
    const existing = document.getElementById("output").value;
    document.getElementById("output").value = existing + message + "\n";
}

function clearOutput() {
    document.getElementById("output").value = "";
}

let loading = false;

async function runCode() {

    const selectedTest = document.getElementById("test").value;
    if (selectedTest === null || selectedTest.trim() === "") {
    const prepared = await prepare();
    if (!prepared){
        return;
    }

    const exitCode = await cheerpjRunMain("Main", "/app/LibraryBookWebTutorial.jar:/app/Testers.jar"); }
    else {
        runTest(selectedTest)
    }
}


async function prepare(){
if (loading) {
        return;
    }
    removeLineMarkers();
    clearOutput();
    updateOutput("Preparing code for execution")
    await addStringFileToCheerpJ();
    updateOutput("Compiling, please wait");
    loading = true;
    indicateProcessRunning();
    const compilationSuccessful = await compile();
    loading = false;
    if (!compilationSuccessful){
        alert("Compilation has failed, see output for details");

        return false;
    } else {  
        save(); //only save when compiled okay
        updateOutput("\nCompilation complete, executing tests");
        return true;
    }
}

function save(){
    localStorage.setItem("code", editor.getValue());
}

function load(){
    const savedCode = localStorage.getItem("code");
    if (savedCode != null){
        editor.session.setValue(savedCode);
    }
}


function userGuid(){
    const savedGuid = localStorage.getItem("userGuid");
    if (savedGuid == null){
        const newGuid = crypto.randomUUID();
        localStorage.setItem("userGuid", newGuid);
        return newGuid;
    }
    return savedGuid;
}


async function runTest(testName) {

    currentTest = testName;
    const prepared = await prepare();
    if (!prepared){
        return;
    }
    const exitCode = await cheerpjRunMain("Main", "/app/LibraryBookWebTutorial.jar:/app/Testers.jar", testName); 

}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Writes dots to the screen to indicate progress
 */
async function indicateProcessRunning() {
    if (loading) {
        while (true) {
            const existing = document.getElementById("output").value;
            document.getElementById("output").value = existing + ".";
            await delay(1000);
            if (!loading) {
                break;
            }
        }
    }
}


async function notifyAPI(testName, compiled, passed, error){

if (!optIn){
    return;
}

    const guid = userGuid();
    const code = editor.getValue();


    const url = "https://amuncey.linux.studentwebserver.co.uk/jooft-api/api.php";

    const body = JSON.stringify(
        {   guid: guid,
            code: code,
            test_name: testName,
            "compiled": compiled,
            test_pass: passed,
            error: error
         }
    );

    const response = await fetch(url, {
        method: "POST",
        body: body
    });

    //console.log(response);


    console.log("test: " + testName + 
        " compiled: " + compiled +
    " passed: " + passed + " error: " + error +
" guid: " + guid + " code:\n" + code);


}



