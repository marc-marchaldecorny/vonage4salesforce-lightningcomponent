global class VonageAPIMessaging {
    global static final String SMS_CHANNEL = 'sms';
    global static final String MMS_CHANNEL = 'mms';
    global static final String MESSENGER_CHANNEL = 'messenger';
    global static final String VIBER_CHANNEL = 'viber_service_msg';
    global static final String WHATSAPP_CHANNEL = 'whatsapp';
    
    // Vonage API Configuration
    global static VonageAPIConfig__c vonageConfig = getVonageApiSettingsAPEX();

    // set variables
    global static final String VONAGE_API_KEY = vonageConfig.API_Key__c;
    global static final String VONAGE_API_SECRET = vonageConfig.API_Secret__c;
    global static final String VONAGE_SMS_LVN = vonageConfig.SMS_LVN__c;
    global static final String VONAGE_WHATSAPP_LVN = vonageConfig.WHATSAPP_LVN__c;
    global static final String VONAGE_MESSAGES_VONAGE_URL = vonageConfig.MESSAGES_VONAGE_URL__c;
    global static final String VONAGE_MESSAGES_API_SANDBOX_URL = vonageConfig.MESSAGES_API_SANDBOX_URL__c;
    global static final String VONAGE_SMS_VONAGE_URL = vonageConfig.SMS_VONAGE_URL__c;
    global static final Boolean VONAGE_USE_MESSAGES_API_FOR_SMS = vonageConfig.USE_MESSAGES_API_FOR_SMS__c;
    global static final Boolean VONAGE_USE_SANDBOX_FOR_MESSAGES_API = vonageConfig.USE_SANDBOX_FOR_MESSAGES_API__c;


    global class VonageRequest {
        @InvocableVariable(required=true) global String toId;
        @InvocableVariable(required=true) global String fromId;
        @InvocableVariable(required=true) global String text;
        @InvocableVariable(required=true) global String channel;
    }
    
    
    //Method to return Vonage API configuration VonageAPIConfig__c
    @AuraEnabled
    public static VonageAPIConfig__c getVonageApiSettingsAPEX(){
        VonageAPIConfig__c vonageConfig = VonageAPIConfig__c.getInstance();
        return vonageConfig;
    }
    
    // send Bulk Messages with a single authentication request
    @InvocableMethod(label='Send Vonage Message')
    global static void sendMessages(List<VonageRequest> requests) {
        if(System.Limits.getLimitFutureCalls() > requests.size()) {
            String authHeader = getAuthorizationHeader();
            for(VonageRequest request : requests) {
                sendMessageWithAuthheader(request.toId, request.fromId, request.text, request.channel, authHeader);
            }
        }
    }
    
    // send individual Message with internal authentication
    //@future(callout=true)
    @AuraEnabled
    global static String sendMessage(String toId, String fromId, String text, String channel) {
        String body = buildRequestBody(toId, fromId, text, channel);
        String authHeader = getAuthorizationHeader();
        HttpRequest request = buildRequest(channel, body, authHeader);
        Http http = new Http();
        HTTPResponse res = http.send(request);
        String result='null';
        if( res.getStatusCode() > 299)
        {
            // failed to send SMS
            result='{"status":"failed","message":'+res.getBody()+'}';
        }
        else
        {
            // failed to send SMS
            result='{"status":"success","message":'+res.getBody()+'}';
        }
        System.Debug('result:'+result);
        return result;
       
        
    }

    @Future(callout=true)
    private static void sendMessageWithAuthheader(String toId, String fromId, String text, String channel, string authHeader) {
        String body = buildRequestBody(toId, fromId, text, channel);
        HttpRequest request = buildRequest(channel, body, authHeader);
        Http http = new Http();
        HTTPResponse res = http.send(request);
    }

    public static String buildRequestBody(String toId, String fromId, String text, String channel) {
        
        String result = '';
        result += '{';

        if (channel == SMS_CHANNEL) {
            //if( fromId == '') {fromId = VONAGE_SMS_LVN;}
            fromId = VONAGE_SMS_LVN;
            result += '"from": { "type": "sms", "number": "' + fromId + '" },';
            result += '"to": { "type": "sms", "number": "' + toId + '" },';
        }

        if (channel == MMS_CHANNEL) {
            result += '"from": { "type": "mms", "number": "' + fromId + '" },';
            result += '"to": { "type": "mms", "number": "' + toId + '" },';
        }

        if (channel == MESSENGER_CHANNEL) {
            result += '"from": { "type": "messenger", "id": "' + fromId + '" },';
            result += '"to": { "type": "messenger", "id": "' + toId + '" },';
        }

        if (channel == VIBER_CHANNEL) {
            result += '"from": { "type": "viber_service_msg", "id": "' + fromId + '" },';
            result += '"to": { "type": "viber_service_msg", "number": "' + toId + '" },';
        }

        if (channel == WHATSAPP_CHANNEL) {
            if( fromId == '') {fromId = VONAGE_WHATSAPP_LVN;}
            result += '"from": { "type": "whatsapp", "number": "' + fromId + '" },';
            result += '"to": { "type": "whatsapp", "number": "' + toId + '" },';
        }

        result += '"message": {';
        if(channel == MMS_CHANNEL) {
            result += '"content": {"type": "image", "image": { "url": "' + text + '" }';
        }
        else {
            result += '"content": {"type": "text", "text": "' + text + '"';
        }
        result += '}';
        result += '}';
        result += '}';
        //System.Debug('JSON REQUEST ' + result);
        return result;
    }

    public static HttpRequest buildRequest(String channel, String body, String authHeader) {
        HttpRequest req = new HttpRequest();
        
        String apiEndpoint = VONAGE_MESSAGES_VONAGE_URL;
        if (channel == SMS_CHANNEL && VONAGE_USE_MESSAGES_API_FOR_SMS == false) { apiEndpoint=VONAGE_SMS_VONAGE_URL;}
        if (channel == WHATSAPP_CHANNEL && VONAGE_USE_SANDBOX_FOR_MESSAGES_API == false) { apiEndpoint=VONAGE_MESSAGES_API_SANDBOX_URL;}
        System.Debug('apiEndpoint: ' + apiEndpoint); 
        req.setEndpoint(apiEndpoint);
        req.setMethod('POST');
        req.setHeader('Authorization', authHeader);
        req.setHeader('Content-Type', 'application/json');
        req.setBody(body);
        System.Debug('body ' + body); 

        return req;
    }

    public static String getAuthorizationHeader() {
        String apiKey = VONAGE_API_KEY; 
        String apiSecret = VONAGE_API_SECRET;
        System.Debug('VONAGE_API_KEY ' + VONAGE_API_KEY);
        System.Debug('VONAGE_API_SECRET ' + VONAGE_API_SECRET);

        Blob headerValue = Blob.valueOf(apiKey + ':' + apiSecret);
        //System.Debug('Authentication ' + headerValue);
        return 'BASIC ' + EncodingUtil.base64Encode(headerValue);
    }
}