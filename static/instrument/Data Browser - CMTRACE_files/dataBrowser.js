//Universitaet zu Koeln, Institut fuer Meteorologie und Geophysik
//DataBrowser
//(c) M. Maahn, 2012

//TUD
//adapted by J. Dias Neto 2023


if ((yourIp.substring(0,6)=="134.95") || (yourIp.substring(0,6)=="134.94") || (yourIp.substring(0,7)=="131.220") || (yourIp.substring(0,7)=="140.172")) {
    var uniNetwork= true;
}
else {
    var uniNetwork= false;
}
var path="/dataBrowser/"
var fileNames ="dataBrowser"
var ext =".html"

var dataStrings = new Object();
var minDates = new Object();
var maxDates = new Object();
var hasDisabled = new Object();
var longName = new Object();



//----------------------------------------------------

//nice name for the site
longName["CMTRACE-2023"] = "cmtrace-2023";
longName["CMTRACE-2022"] = "cmtrace-2022";
longName["CMTRACE-2021"] = "cmtrace-2021";
longName["KNMI"] = "KNMI";


//first available measurements
minDates["CMTRACE-2023"] = "2023-06-16";
minDates["CMTRACE-2022"] = "2022-05-16";
minDates["CMTRACE-2021"] = "2021-05-10";
minDates["KNMI"] = "2021-05-10";

//last available measurements, 0 = today
maxDates["CMTRACE-2023"] = 0;
maxDates["CMTRACE-2022"] = "2022-06-12";
maxDates["CMTRACE-2021"] = "2021-10-03";
maxDates["KNMI"] = 0;

//are some instruments deactivated from outside of institute?
hasDisabled["CMTRACE-2023"] = false;
hasDisabled["CMTRACE-2022"] = false;
hasDisabled["CMTRACE-2021"] = false;
hasDisabled["KNMI"] = false;

dataStrings["CMTRACE-2023"] = new Object();
dataStrings["CMTRACE-2022"] = new Object();
dataStrings["CMTRACE-2021"] = new Object();
dataStrings["KNMI"] = new Object();

//for dataString format see: http://docs.jquery.com/UI/Datepicker/$.datepicker.formatDate#examples

//CMTRACE-2023
dataStrings["CMTRACE-2023"]["WC_TUD_vertical_wind"] = "'cmtrace/tud_windcube/'yymmdd'_rad_wind_elv_90.png'";
dataStrings["CMTRACE-2023"]["WC_TUD_wind_direction"] = "'cmtrace/tud_windcube/'yymmdd'_hor_wind_dir.png'";
dataStrings["CMTRACE-2023"]["WC_TUD_wind_speed"] = "'cmtrace/tud_windcube/'yymmdd'_hor_wind_speed.png'";

dataStrings["CMTRACE-2023"]["skiron_vertical_wind"] = "'cmtrace/skiron/w/'yymmdd'.png'";
dataStrings["CMTRACE-2023"]["skiron_wind_direction"] = "'cmtrace/skiron/winddirection/'yymmdd'.png'";
dataStrings["CMTRACE-2023"]["skiron_wind_speed"] = "'cmtrace/skiron/windspeed/'yymmdd'.png'";

dataStrings["CMTRACE-2023"]["WC_KNMI_vertical_wind"] = "'cmtrace/knmi_windcube/'yy'/'mm'/'yymmdd'_KNMI_Windcube_DBS_vertical.png'";

dataStrings["CMTRACE-2023"]["WC_KNMI_wind_direction"] = "'cmtrace/knmi_windcube/'yy'/'mm'/'yymmdd'_KNMI_Windcube_DBS_winddirection.png'";
dataStrings["CMTRACE-2023"]["WC_KNMI_wind_speed"] = "'cmtrace/knmi_windcube/'yy'/'mm'/'yymmdd'_KNMI_Windcube_DBS_windspeed.png'";
dataStrings["CMTRACE-2023"]["WC_KNMI_overview"] = "'cmtrace/knmi_windcube/'yy'/'mm'/'yymmdd'_KNMI_Windcube_vertical_stare.png'";

dataStrings["CMTRACE-2023"]["ceilometer"] = "'cmtrace/ceilometer/'yymmdd'_ceilometer.png'";

dataStrings["CMTRACE-2023"]["ze_MR"] = "'cmtrace/clara/'yy'/'mm'/'yymmdd'_clara_35_Ze.png'";
dataStrings["CMTRACE-2023"]["mdv_MR"] = "'cmtrace/clara/'yy'/'mm'/'yymmdd'_clara_35_mdv.png'";

//CMTRACE-2022
dataStrings["CMTRACE-2022"]["WC_KNMI_vertical_wind"] = "'cmtrace/knmi_windcube/'yy'/'mm'/'yymmdd'_rad_wind_elv_90.png'";
dataStrings["CMTRACE-2022"]["WC_KNMI_wind_direction"] = "'cmtrace/knmi_windcube/'yy'/'mm'/'yymmdd'_hor_wind_dir.png'";
dataStrings["CMTRACE-2022"]["WC_KNMI_wind_speed"] = "'cmtrace/knmi_windcube/'yy'/'mm'/'yymmdd'_hor_wind_speed.png'";

dataStrings["CMTRACE-2022"]["ze_CL"] = "'cmtrace/clara/'yy'/'mm'/clara_35_ze_'yymmdd'.png'";
dataStrings["CMTRACE-2022"]["mdv_CL"] = "'cmtrace/clara/'yy'/'mm'/clara_35_mdv_'yymmdd'.png'";
dataStrings["CMTRACE-2022"]["sw_CL"] = "'cmtrace/clara/'yy'/'mm'/clara_35_sw_'yymmdd'.png'";
dataStrings["CMTRACE-2022"]["ldr_CL"] = "'cmtrace/clara/'yy'/'mm'/clara_35_ldr_'yymmdd'.png'";
dataStrings["CMTRACE-2022"]["zdr_CL"] = "'cmtrace/clara/'yy'/'mm'/'yymmdd'_clara_35_zdr.png'";


dataStrings["CMTRACE-2022"]["wind_dir_CL35"] = "'cmtrace/clara/'yy'/'mm'/'yymmdd'_hor_wind_dir_35_GHz.png'";
dataStrings["CMTRACE-2022"]["wind_vel_CL35"] = "'cmtrace/clara/'yy'/'mm'/'yymmdd'_hor_wind_speed_35_GHz.png'";
dataStrings["CMTRACE-2022"]["slant_LDR_CL35"] = "'cmtrace/clara/'yy'/'mm'/'yymmdd'_ldr_slanted_35_GHz.png'";

dataStrings["CMTRACE-2022"]["wind_dir_CL94"] = "'cmtrace/clara94/'yy'/'mm'/'yymmdd'_hor_wind_dir_94_GHz.png'";
dataStrings["CMTRACE-2022"]["wind_vel_CL94"] = "'cmtrace/clara94/'yy'/'mm'/'yymmdd'_hor_wind_speed_94_GHz.png'";
dataStrings["CMTRACE-2022"]["slant_LDR_CL94"] = "'cmtrace/clara94/'yy'/'mm'/'yymmdd'_ldr_slanted_94_GHz.png'";

dataStrings["CMTRACE-2022"]["ze_MR"] = "'cmtrace/mara/'yy'/'mm'/'yymmdd'_mara_35_ze.png'";
dataStrings["CMTRACE-2022"]["mdv_MR"] = "'cmtrace/mara/'yy'/'mm'/'yymmdd'_mara_35_mdv.png'";
dataStrings["CMTRACE-2022"]["sw_MR"] = "'cmtrace/mara/'yy'/'mm'/'yymmdd'_mara_35_sw.png'";
dataStrings["CMTRACE-2022"]["ldr_MR"] = "'cmtrace/mara/'yy'/'mm'/'yymmdd'_mara_35_ldr.png'";
dataStrings["CMTRACE-2022"]["zdr_MR"] = "'cmtrace/mara/'yy'/'mm'/'yymmdd'_mara_35_zdr.png'";

dataStrings["CMTRACE-2022"]["ceilometer"] = "'cmtrace/ceilometer/'yymmdd'_ceilometer.png'";

//CMTRACE-2021
dataStrings["CMTRACE-2021"]["WC_KNMI_vertical_wind"] = "'cmtrace/knmi_windcube/'yy'/'mm'/'yymmdd'_rad_wind_elv_90.png'";
dataStrings["CMTRACE-2021"]["WC_KNMI_wind_direction"] = "'cmtrace/knmi_windcube/'yy'/'mm'/'yymmdd'_hor_wind_dir.png'";
dataStrings["CMTRACE-2021"]["WC_KNMI_wind_speed"] = "'cmtrace/knmi_windcube/'yy'/'mm'/'yymmdd'_hor_wind_speed.png'";

dataStrings["CMTRACE-2021"]["ze_CL"] = "'cmtrace/clara/'yy'/'mm'/clara_35_ze_'yymmdd'.png'";
dataStrings["CMTRACE-2021"]["mdv_CL"] = "'cmtrace/clara/'yy'/'mm'/clara_35_mdv_'yymmdd'.png'";
dataStrings["CMTRACE-2021"]["sw_CL"] = "'cmtrace/clara/'yy'/'mm'/clara_35_sw_'yymmdd'.png'";
dataStrings["CMTRACE-2021"]["ldr_CL"] = "'cmtrace/clara/'yy'/'mm'/clara_35_ldr_'yymmdd'.png'";
dataStrings["CMTRACE-2021"]["zdr_CL"] = "'cmtrace/clara/'yy'/'mm'/'yymmdd'_clara_35_zdr.png'";


dataStrings["CMTRACE-2021"]["wind_dir_CL35"] = "'cmtrace/clara/'yy'/'mm'/'yymmdd'_hor_wind_dir_35_GHz.png'";
dataStrings["CMTRACE-2021"]["wind_vel_CL35"] = "'cmtrace/clara/'yy'/'mm'/'yymmdd'_hor_wind_speed_35_GHz.png'";
dataStrings["CMTRACE-2021"]["slant_LDR_CL35"] = "'cmtrace/clara/'yy'/'mm'/'yymmdd'_ldr_slanted_35_GHz.png'";

dataStrings["CMTRACE-2021"]["wind_dir_CL94"] = "'cmtrace/clara94/'yy'/'mm'/'yymmdd'_hor_wind_dir_94_GHz.png'";
dataStrings["CMTRACE-2021"]["wind_vel_CL94"] = "'cmtrace/clara94/'yy'/'mm'/'yymmdd'_hor_wind_speed_94_GHz.png'";
dataStrings["CMTRACE-2021"]["slant_LDR_CL94"] = "'cmtrace/clara94/'yy'/'mm'/'yymmdd'_ldr_slanted_94_GHz.png'";

dataStrings["CMTRACE-2021"]["ze_MR"] = "'cmtrace/mara/'yy'/'mm'/'yymmdd'_mara_35_ze.png'";
dataStrings["CMTRACE-2021"]["mdv_MR"] = "'cmtrace/mara/'yy'/'mm'/'yymmdd'_mara_35_mdv.png'";
dataStrings["CMTRACE-2021"]["sw_MR"] = "'cmtrace/mara/'yy'/'mm'/'yymmdd'_mara_35_sw.png'";
dataStrings["CMTRACE-2021"]["ldr_MR"] = "'cmtrace/mara/'yy'/'mm'/'yymmdd'_mara_35_ldr.png'";
dataStrings["CMTRACE-2021"]["zdr_MR"] = "'cmtrace/mara/'yy'/'mm'/'yymmdd'_mara_35_zdr.png'";

dataStrings["CMTRACE-2021"]["ceilometer"] = "'cmtrace/ceilometer/'yymmdd'_ceilometer.png'";


//KNMI-Charts
dataStrings["KNMI"]["chart_00"] = "'https://cdn.knmi.nl/knmi/map/page/klimatologie/daggegevens/weerkaarten/analyse_'yymmdd'00.gif'";
dataStrings["KNMI"]["chart_06"] = "'https://cdn.knmi.nl/knmi/map/page/klimatologie/daggegevens/weerkaarten/analyse_'yymmdd'06.gif'";
dataStrings["KNMI"]["chart_12"] = "'https://cdn.knmi.nl/knmi/map/page/klimatologie/daggegevens/weerkaarten/analyse_'yymmdd'12.gif'";
dataStrings["KNMI"]["chart_18"] = "'https://cdn.knmi.nl/knmi/map/page/klimatologie/daggegevens/weerkaarten/analyse_'yymmdd'18.gif'";




//dataStrings["CMTRACE"]["rad_wind90_WC"] = "'cmtrace/windcube/'yy'/'mm'/rad_wind_elv_90_'yymmdd'.png'";
//dataStrings["CMTRACE"]["cnr_wind90_WC"] = "'cmtrace/windcube/'yy'/'mm'/cnr_elv_90_'yymmdd'.png'";
//dataStrings["CMTRACE"]["SW_wind90_WC"] = "'cmtrace/windcube/'yy'/'mm'/spec_width_elv_90_'yymmdd'.png'";

//dataStrings["CMTRACE"]["ze_CL"] = "'cmtrace/clara/'yy'/'mm'/clara_35_ze_'yymmdd'.png'";
//dataStrings["CMTRACE"]["mdv_CL"] = "'cmtrace/clara/'yy'/'mm'/clara_35_mdv_'yymmdd'.png'";
//dataStrings["CMTRACE"]["sw_CL"] = "'cmtrace/clara/'yy'/'mm'/clara_35_sw_'yymmdd'.png'";
//dataStrings["CMTRACE"]["ldr_CL"] = "'cmtrace/clara/'yy'/'mm'/clara_35_ldr_'yymmdd'.png'";


//----------------------------------------------------


function setImages(){
        var site = $("select#selectSite").val();
        var date = dPick.datepicker("getDate");


        setOneImage("UpperLeft",date,site);
        if (noPanels > 1)  setOneImage("UpperRight",date,site);
        if (noPanels > 2)  setOneImage("LowerRight",date,site);
        if (noPanels > 3)  setOneImage("LowerLeft",date,site);


setNoOfPanelButton();

};

function setOneImage(loc,date,site){
    var dataStringKey = $("select#select"+loc).val();

    if (dataStringKey != "default") {
        var dataString = dataStrings[site][dataStringKey]
        var fileSrc = $.datepicker.formatDate(dataString, date);

        $( "#"+loc+"Data" ).attr("src",fileSrc);
        $( "#"+loc+"Data" ).attr("title",fileSrc);
        $( "#"+loc+"Error" ).html(" ")
        $( "#"+loc+"Link" ).attr("href",fileSrc);

}

};

function createUrl(date) {
    var uri =  new Uri(document.URL);
    var uriNew = new Uri(uri.protocol() + "://" + uri.host()+ uri.path());
    uriNew.addQueryParam('site', encodeURI($("select#selectSite").val()));
    //uriNew.addQueryParam('date', encodeURI($("input#datepicker_date").val()));
    uriNew.addQueryParam('date', encodeURI(date));
    uriNew.addQueryParam('UpperLeft', encodeURI($("select#select"+"UpperLeft").val()));
    if (noPanels > 1) uriNew.addQueryParam('UpperRight', encodeURI($("select#select"+"UpperRight").val()));
    if (noPanels > 2) uriNew.addQueryParam('LowerRight', encodeURI($("select#select"+"LowerRight").val()));
    if (noPanels > 3) uriNew.addQueryParam('LowerLeft', encodeURI($("select#select"+"LowerLeft").val()));

    return uriNew

};


//funtion to change number of panels
function setNoOfPanelButton() {
    //build new url
    var uri =  new Uri(document.URL);
    var uriNew = new Uri(uri.protocol() + "://" + uri.host()+ path + fileNames + "$$"+ext);
    var uriAdd = new Uri
    //find out current settings
    uriAdd.addQueryParam('site', encodeURI($("select#selectSite").val()));
    uriAdd.addQueryParam('date', encodeURI($("input#datepicker_date").val()));
    uriAdd.addQueryParam('UpperLeft', encodeURI($("select#select"+"UpperLeft").val()));
    if (noPanels > 1) uriAdd.addQueryParam('UpperRight', encodeURI($("select#select"+"UpperRight").val()));
    if (noPanels > 2) uriAdd.addQueryParam('LowerRight', encodeURI($("select#select"+"LowerRight").val()));
    if (noPanels > 3) uriAdd.addQueryParam('LowerLeft', encodeURI($("select#select"+"LowerLeft").val()));
    uriNew = uriNew + uriAdd

    $("select#noOfPanels").change(function() {

            uriNew = uriNew.replace("$$",$("select#noOfPanels").val());
            location.href = uriNew;

    });



}


function populateSelect() {
    var site = $("select#selectSite").val();
    $("select.select").html('<option value="default">Select:</option>')
    $.each(dataStrings[site], function(key, value) {
        if (value =="disabled") {
            $("select.select").append("<option value='"+key+"' disabled='disabled'>"+key+"</option>");
        }
        else {
            $("select.select").append("<option value='"+key+"'>"+key+"</option>");
        }
    });
    if (!uniNetwork && hasDisabled[site]) {
        $("select.select").append("<option value='disabled' disabled='disabled'>Some instruments are only accesible from the network of the University of Cologne!</option>");
    }
};





$(document).ready(function() {
    //create datePicker
    dPick = $( "#datepicker_date" ).datepicker({
        changeMonth: true,
        changeYear: true,
        onSelect: function() {
            setImages();
            },
        dateFormat: "yy-mm-dd",
        firstDay:1
        });
    //buttons
    $("#datepicker_prev").click(function() {
        var currentDate = dPick.datepicker( "getDate");
        currentDate.setDate(currentDate.getDate()-1);
        dPick.datepicker( "setDate",currentDate);
        setImages();
    });
    $("#datepicker_next").click(function() {
        var currentDate = dPick.datepicker( "getDate");
        currentDate.setDate(currentDate.getDate()+1);
        dPick.datepicker( "setDate",currentDate);
        setImages();
    });


    //change url if date is changed
    $("select#dialog-modal-select").change(function() {
        uriNew = createUrl($("select#dialog-modal-select").val())
        $("a#dialog-modal-url").text(uriNew);
        $("a#dialog-modal-url").attr("href", uriNew);
    });

    //open permalink dialog
    $("#permalink").click(function() {
        //add current date to list
        $("option#dialog-modal-extraDate").text($("input#datepicker_date").val());
        $("option#dialog-modal-extraDate").val($("input#datepicker_date").val());
        //create uri with designated date
        uriNew = createUrl($("select#dialog-modal-select").val())
        $("a#dialog-modal-url").text(uriNew);
        $("a#dialog-modal-url").attr("href", uriNew);
        $("div#dialog-modal").dialog('open')

    });



    //populate select site
    $.each(dataStrings, function(key, value) {
        $("select#selectSite").append("<option value='"+key+"'>"+longName[key]+"</option>");
    });


        //parseUrl



    var uri =  new Uri(document.URL);

    var urlSite = uri.getQueryParamValue('site');
    if (urlSite) {

        //set select option accordingly to site
        $("select#selectSite option[value=" + decodeURI(urlSite) +"]").attr("selected","selected") ;
        //populate select buttons with chosen site
        populateSelect();

        //set select option accordingly to requested plots
        $("select#select"+"UpperLeft"+" option[value=" + decodeURI(uri.getQueryParamValue('UpperLeft')) +"]").attr("selected","selected") ;
        if (noPanels > 1) $("select#select"+"UpperRight"+" option[value=" + decodeURI(uri.getQueryParamValue('UpperRight')) +"]").attr("selected","selected") ;
        if (noPanels > 2) $("select#select"+"LowerRight"+" option[value=" + decodeURI(uri.getQueryParamValue('LowerRight')) +"]").attr("selected","selected") ;
        if (noPanels > 3) $("select#select"+"LowerLeft"+" option[value=" + decodeURI(uri.getQueryParamValue('LowerLeft')) +"]").attr("selected","selected") ;
        dPick.datepicker("setDate",decodeURI(uri.getQueryParamValue('date')));
    }

    else {

        //populate select buttons with default site
        populateSelect();
        //start with yesterday
        dPick.datepicker("setDate",-1);

    }


    //what if no img available
    $("img#UpperLeftData").error(function () {
        $("div#UpperLeftError").html("No data and/or plot available for "+$("#datepicker_date").val());
        $("div#UpperLeftError").css("margin","100px");
    });
    $("img#UpperRightData").error(function () {
        $("div#UpperRightError").html("No data and/or plot available for "+$("#datepicker_date").val());
        $("div#UpperRightError").css("margin","100px");
    });
    $("img#LowerLeftData").error(function () {
        $("div#LowerLeftError").html("No data and/or plot available for "+$("#datepicker_date").val());
        $("div#LowerLeftError").css("margin","100px");
    });
    $("img#LowerRightData").error(function () {
        $("div#LowerRightError").html("No data and/or plot available for "+$("#datepicker_date").val());
        $("div#LowerRightError").css("margin","100px");
    });


    //if product is changed
    $("select.select").change(function() {
        setImages();
    });

    //if site is changed
    $("select#selectSite").change(function() {
        var site = $("select#selectSite").val();
        dPick.datepicker( "option" , "minDate" , minDates[site] )
        dPick.datepicker( "option" , "maxDate" , maxDates[site] )
        populateSelect()
        setImages();
    });

//  //minDate of first object
//  for (var prop in minDates) {
//      firstSite = prop
//      break;
//  }
    var site = $("select#selectSite").val();
    dPick.datepicker( "option" , "minDate" , minDates[site] )
    dPick.datepicker( "option" , "maxDate" , maxDates[site] )

    //keybindings
    $(document).keyup(function (key) {
        //left = a
        if (key.which == "65") {
            var currentDate = dPick.datepicker( "getDate");
            currentDate.setDate(currentDate.getDate()-1);
            dPick.datepicker( "setDate",currentDate);
            setImages();
        }
        //right = s
        else if (key.which == "83") {
            var currentDate = dPick.datepicker( "getDate");
            currentDate.setDate(currentDate.getDate()+1);
            dPick.datepicker( "setDate",currentDate);
            setImages();
        }
    });

    // set urlSite in the beginning only if url parameters are available
    if (urlSite) setImages();

    //enable no of panel button
    setNoOfPanelButton();

    //$('a.lightbox').panView(400,400);

        $( "#dialog-modal" ).dialog({
            height: 300,
            width:700,
            modal: true,
            autoOpen: false,
            buttons: [
                {
                text: "Ok",
                click: function() { $(this).dialog("close"); }
                }
            ]
        });

    });


