// First Search Notification - only show on first address bar search
function firstSearchNotification(tabId, changeInfo) {
    if(changeInfo.url){
        var regex = new RegExp("www\\.bing\\.com\\/search\\?EID=MBHSC&form=.*&pc=.*&q=");
        var isBingExtensionSearch = regex.test(changeInfo.url);
        chrome.storage.local.get({showFirstSearchNotification: true}, (items) => {
            if(isBingExtensionSearch && items && items.showFirstSearchNotification) {
                chrome.tabs.executeScript(tabId, {file: "./scripts/firstSearchNotificationContent.js"});
                chrome.storage.local.set({showFirstSearchNotification: false});
            }
            else if(isBingExtensionSearch && items && !items.showFirstSearchNotification) {
                chrome.tabs.onUpdated.removeListener(firstSearchNotification)
            }
        })
    }
}

var isEdgeClientHintCheck = navigator.userAgentData && navigator.userAgentData.brands.find(brand => brand.brand === "Microsoft Edge");
var isEdgeUserAgentCheck = navigator.userAgent.indexOf("Edg") != -1;
if (!isEdgeClientHintCheck && !isEdgeUserAgentCheck) {
    chrome.tabs.onUpdated.addListener(firstSearchNotification);
    var externalCallback;
    chrome.runtime.onMessageExternal.addListener(
        function (request, sender, sendResponse) {
            const url = 'https://browserdefaults.microsoft.com/';
            if (sender && sender.url && sender.url.toLocaleLowerCase().includes(url) && request == "isExtensionEnabled") {
                chrome.storage.local.get("firstSearchNotificationDismissed", (items) => {
                    if (items.firstSearchNotificationDismissed) {
                        sendResponse({ isEnabled: "true" });
                    }
                    else {
                        externalCallback = sendResponse;
                    }
                });
            }
            return true;
        }
    );

    chrome.runtime.onMessage.addListener(
        function(request) {
            if (request == "notificationDismissed"){
                chrome.storage.local.set({firstSearchNotificationDismissed: true});
                if (externalCallback) {
                    externalCallback({ isEnabled: "true" });
                }
            }
            return true;
        }
    );
    
    chrome.runtime.onConnectExternal.addListener((port) => {
        var url = "https://www.bing.com";
        if (port.name == "extensionStatusCheck" && port.sender && port.sender.url && port.sender.url.toLocaleLowerCase().includes(url)) {
            port.onMessage.addListener((message, port) => {
                if (message === "pollExtensionStatus") {
                    chrome.storage.local.get("firstSearchNotificationDismissed", (items) => {
                        if (items.firstSearchNotificationDismissed) {
                            port.postMessage({isEnabled: "true"})
                        }
                    });
                }
            });
        }      
    });   
}
