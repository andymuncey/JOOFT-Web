
async function Java_Main_jsAlert(lib, message) {
    alert(message);
}

async function Java_Main_updateConsole(lib, message) {
    updateOutput(message);
}

async function Java_Main_registerTestResult(lib, testName, passed) {
    showTestResult(testName, passed);
    const testButton = document.getElementById(testName);
    if (testButton != null){
   
        testButton.style.backgroundColor = passed ? "#e6f8d2": "#fac7b3ff";
    }
  
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
    await cheerpjRunMain("com.sun.tools.javac.Main", "/app/tools.jar", "/str/LibraryBook.java", "-d", "/files/")
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
    await prepare();

    const exitCode = await cheerpjRunMain("Main", "/app/CheerPJTest.jar:/app/Testers.jar"); }
    else {
        runTest(selectedTest)
    }
}


async function prepare(){
if (loading) {
        return;
    }
    clearOutput();
    updateOutput("Preparing code for execution")
    await addStringFileToCheerpJ();
    updateOutput("Compiling, please wait");
    loading = true;
    indicateProcessRunning();
    await compile();
    loading = false;

    updateOutput("\nCompilation complete, executing tests");
}

async function runTest(testName) {

    await prepare();
    const exitCode = await cheerpjRunMain("Main", "/app/CheerPJTest.jar:/app/Testers.jar", testName); 

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



