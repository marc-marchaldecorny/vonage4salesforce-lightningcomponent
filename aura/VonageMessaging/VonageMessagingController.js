({

    
    //Method to set columns and data for datatable
    doInit : function(component,event,helper){
        // create current date instance
        var now = new Date();
        var date = now.getDate();
        var month = now.getMonth() + 1;
        var fullYear = now.getFullYear();
        var today = fullYear + '-' + month + '-' + date;
        component.set("v.today", today);
        component.set("v.overrideMessageContent","no");
     
        
        //------ Subscription to Vonage Messaging backend events/updates -------
        // Get the empApi component
        const empApi = component.find('empApi');
        // Get the channel from the input box
        const channel = '/event/VonageMessagingUpdateEvent__e';
        // Replay option to get new events
        const replayId = -1;

        // Subscribe to an event
        empApi.subscribe(channel, replayId, $A.getCallback(eventReceived => {
            var eventPayload = eventReceived.data.payload;
            console.log("eventPayload");
            console.log(eventPayload.VonageMessagingConversationId__c);
            // Process event
            var MessageConversationData = component.get("v.MessagingConversationData");
            console.log("MessageConversationData");
            console.log(JSON.stringify(MessageConversationData.Id));
            console.log("update data");
            // check if event is for viewed conversation
            if(eventPayload.VonageMessagingConversationId__c ==  MessageConversationData.Id)
            {
            	console.log("match on conversation ID") 
            	helper.getData(component,event,helper);
        	}
            else {
               console.log("no match on conversation ID")                                            
            }
                                                           
            
            

        }))
        .then(subscription => {
    		// Post Subscription Logic.
            console.log('Subscription request sent to: ', subscription.channel);
            // Save subscription to unsubscribe later
            component.set('v.subscription', subscription);
        });
        //------ Gather MessageConversation and Messagehistory Objects -------
        // call helper function to get Conversation Data
        helper.getConversationData(component,event,helper);
        // call helper function to get records data
        helper.getData(component,event,helper);
        

    },
    
    
    saveMessagingHistory : function(component,event,helper){
        console.log('entering save entry script');
        //If form data is valid , save record in database
        if(helper.validateData(component,event,helper)){
            // Appending the new MessageHistory entry in datatable
            // Adding additional fields
            console.log(JSON.parse(JSON.stringify(component.get("v.MessagingConversationData") )));
            console.log('getting selectChannel');
            var selectChannel= "whatsapp"; //component.find("selectChannel").get("v.value");
            component.set("v.objMessagingHistory.Channel__c",selectChannel);
            console.log('selectChannel'+selectChannel);
            component.set("v.objMessagingHistory.Direction__c","out");
            if( component.get("v.overrideMessageContent")  != "no")
            {
				var messageFormContent = component.get("v.overrideMessageContent");
                console.log('overridingContent');    
            }
            else
            {
                var messageFormContent = component.find("MessageFormContent").get("v.value");
            	console.log('messageFormContent'+messageFormContent);               
            }

            component.set("v.objMessagingHistory.Content__c",messageFormContent);
            var datenow = new Date();
 			component.set("v.objMessagingHistory.Date_Time__c",datenow);
            var conversationID = component.get("v.MessagingConversationData.Id");
            component.set("v.objMessagingHistory.MessagingConversation__c",conversationID);
            var ContactNumber = component.get("v.MessagingConversationData.ContactPhoneNumber__c");
            component.set("v.objMessagingHistory.ContactPhoneNumber__c",ContactNumber);
            var BrandNumber = component.get("v.MessagingConversationData.BrandPhoneNumber__c ");
            component.set("v.objMessagingHistory.BrandPhoneNumber__c ",BrandNumber);
            var objMessagingHistory = component.get("v.objMessagingHistory");
   
            //debugger;
            
            console.log('Sending message out to Vonage API');
            helper.sendMessage(component).then( APIResponseMessage => {
                    // successful call of Vonage API to retrieve error or MessageID    
                    console.log('Sending message out to Vonage API - result');
                	console.log('APIResponseMessage:'+APIResponseMessage);
                	var APIresult = JSON.parse(APIResponseMessage);
                	console.log(APIresult);
                
                	// check for message Status from Vonage API
                	if(APIresult.status=='failed')
                	{	// incorrect response from Vonage API
                		var toastRef = $A.get("e.force:showToast");
                        toastRef.setParams({
                                        "type" : "Error",
                                        "title" : "Error when calling Vonage API",
                                        "message" : APIresult.message.title+" - "+APIresult.message.detail,
                                        "mode" : "sticky"
                                    }); 
                         toastRef.fire();
        			}
                    else
                    {	// successfull call from Vonage API
                        // set MessageID and LastMessageState__c
                        component.set("v.objMessagingHistory.LastMessageState__c","sent");
                        component.set("v.objMessagingHistory.VonageMsgId__c",APIresult.message.message_uuid );
                        //call server side method to save MessageHistory record
                        var action = component.get("c.saveMessagingHistoryRecord");
                        action.setParams({
                            MessagingHistoryRecord : objMessagingHistory
                        });
                        action.setCallback(this,function(response){
                            var state = response.getState();
                            if(state == "SUCCESS"){
                                var toastRef = $A.get("e.force:showToast");
                                if(response.getReturnValue() == null){
                                    toastRef.setParams({
                                        "type" : "Success",
                                        "title" : "Success",
                                        "message" : "Message sent.",
                                        "mode" : "dismissible"
                                    });
                                component.set("v.MessageFormContent",'');
                                
                                }
                                else{
                                    toastRef.setParams({
                                        "type" : "Error",
                                        "title" : "Failed to save Message into History",
                                        "message" : response.getReturnValue(),
                                        "mode" : "sticky"
                                    }); 
                                }
                                //toastRef.fire();
            
                                console.log("about to refresh");
                                $A.get("e.force:refreshView").fire();
                                //var a = component.get('c.doInit');
                                helper.getData(component,event,helper);
                                console.log("just refreshed");
                                // blank message field.
                                
                                
                            }
                            else{
                                //To handle server error
                                console.log('Error during saving '+state);
                            }
                        });
                        $A.enqueueAction(action); 
    				}
                    }, 
                    function(errorMessage){
                        console.log("Rejected by promise");
                        helper.showToastMessage(component, "Failure " + errorMessage);
                    }
        )
        }
        else{
          // Validation error
          console.log('Error during validation ');
       }
    
    },
 // Functions for Video Modal
 	hideVideoModal: function(component, event, helper) {
    	component.set("v.ShowVideoModal", false);
    },
        
    activateVideoModal: function(component, event, helper) {
     console.log("activateVideoModal");
     component.set("v.overrideMessageContent","Please join the video session on : https://mdecorny.nexmodemo.com/nestle/mob/");
     
        var overrideMessageContentTmp = component.get("v.overrideMessageContent");
        console.log("overrideMessageContentTmp");
        console.log(overrideMessageContentTmp);
        $A.enqueueAction(component.get('c.saveMessagingHistory'));

      component.set("v.ShowVideoModal", true);
    },
 // Functions for Media Modal        
    hideMediaModal: function(component, event, helper) {
      component.set("v.ShowMediaModal", false);
      component.set("v.overrideMessageContent","");
    
    },
        
    activateMediaModal: function(component, event, helper) {
      component.set("v.ShowMediaModal", true);
    },
        
 // Functions for Template Modal        
    hideTemplateModal: function(component, event, helper) {
      component.set("v.ShowTemplateModal", false);
      //component.set("v.overrideMessageContent","");
    
    },
        
    activateTemplateModal: function(component, event, helper) {
      component.set("v.ShowTemplateModal", true);
    },    
      
})