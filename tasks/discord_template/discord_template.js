"use strict"

class DiscordDoc {
    constructor() {
        let dd = this;
        dd.template_str = DiscordDoc.initial_template_str;
    } // end constructor()

    init() {
        let dd = this;

        dd.local_date_str = "2024-02-11"; // Will be derived from date input
        dd.local_time_str = "18:45"; // Will be derived from time input

        dd.discord_str = "dummy"; // Will contain template updated with Hammertime values

        dd.datetime_js = null; // Date() updated in update_datetime() from current input values

        dd.unix_datetime_int = null; // Int unix timestamp updated in update_datetime() from current input values

        dd.MAX_RESET = 5;

        // -------------------------------
        // Date time input elements

        dd.date_el = document.getElementById("input_date");
        dd.date_el.addEventListener('change', function (){
            console.log(`date=${this.value}`);
            dd.update_datetime(dd);
        })

        dd.time_el = document.getElementById("input_time");
        dd.time_el.addEventListener('change', function (){
            console.log(`time=${this.value}`);
            dd.update_datetime(dd);
        })

        dd.date_el.valueAsDate = new Date();

        // -------------------------------
        // Hammertime copy elements

        dd.hammertime_date_display_el = document.getElementById("hammertime_date_display");
        dd.hammertime_date_el = document.getElementById("hammertime_date");
        document.getElementById("hammertime_date_button").addEventListener("click", (e) => {
            dd.ui_hammertime_copy(dd.hammertime_date_el);
        });

        dd.hammertime_time_display_el = document.getElementById("hammertime_time_display");
        dd.hammertime_time_el = document.getElementById("hammertime_time");
        document.getElementById("hammertime_time_button").addEventListener("click", (e) => {
            dd.ui_hammertime_copy(dd.hammertime_time_el);
        });

        dd.hammertime_datetime_display_el = document.getElementById("hammertime_datetime_display");
        dd.hammertime_datetime_el = document.getElementById("hammertime_datetime");
        document.getElementById("hammertime_datetime_button").addEventListener("click", (e) => {
            dd.ui_hammertime_copy(dd.hammertime_datetime_el);
        });

        // -------------------------------
        // Discord template elements

        dd.template_el = document.getElementById("discorddoc_template");
        dd.template_el.innerText = dd.template_str;
        dd.template_el.addEventListener("input", (event) => {
            dd.template_updated(dd);
        });

        document.getElementById("store").addEventListener("click", (e) => {
            dd.ui_click_store(dd);
        });

        document.getElementById("reset").addEventListener("click", (e) => {
            dd.ui_click_reset(dd);
        });

        // -------------------------------
        // Display area elements

        dd.display_el = document.getElementById("discorddoc_display");
        document.getElementById("copy").addEventListener("click", (e) => {
            dd.ui_click_copy(dd);
        });

        //----------------------------------------------------------------------
        // trigger an 'update' so the display area is populated
        dd.update_datetime(dd);
    } // end init()

    // The user has changed local date or time.
    update_datetime(dd) {
        dd.local_date_str = dd.date_el.value;
        dd.local_time_str = dd.time_el.value;
        dd.local_datetime_str = dd.local_date_str+"T"+dd.local_time_str;
        dd.datetime_js = new Date(dd.local_datetime_str);
        dd.unix_timestamp_int = Math.round(dd.datetime_js.getTime()/1000);

        console.log(`Local datetime: ${dd.local_datetime_str}, timestamp: ${dd.unix_timestamp_int}`);
        dd.update_hammertime(dd);
        dd.update_output(dd);
    }

    // The user has changed the template
    template_updated(dd) {
        // First we have to clean out the double linefeeds in the template
        // Remove single leading linefeed (<div>)
        let html_str = dd.template_el.innerHTML;
        if (html_str.startsWith("<div><br></div>")) {
            html_str = html_str.slice(14);
        }
        if (html_str.startsWith("<br>")) {
            html_str = html_str.slice(4);
        }
        dd.template_str = html_str
            .replaceAll("<div><br></div>","\n")
            .replaceAll("<div>","\n")
            .replaceAll("</div>","")
            .replaceAll("<br>","\n");

        //console.log(`template_updated() '${dd.template_str}'`);
        //console.log(`linefeeds: ${dd.template_str.replaceAll('\n','$')}`);
        dd.update_output(dd);
    }

    update_hammertime(dd) {
        // #DATE#
        dd.hammertime_date_el.innerText = dd.output_replace_date("#DATE#");
        dd.hammertime_date_display_el.innerText = dd.display_replace_date("#DATE#");

        // #TIME#
        dd.hammertime_time_el.innerText = dd.output_replace_time("#TIME#");
        dd.hammertime_time_display_el.innerText = dd.display_replace_time("#TIME#");

        // #DATETIME#
        dd.hammertime_datetime_el.innerText = dd.output_replace_datetime("#DATETIME#");
        dd.hammertime_datetime_display_el.innerText = dd.display_replace_datetime("#DATETIME#");
    }

    update_output(dd)  {
        let display_str = "";
        dd.discord_str = "";

        let lines = dd.template_str.split("\n");
        for (let i=0; i<lines.length; i++) {
            let display_line = lines[i];
            let output_line = lines[i];

            // Replace #DATETIME#
            display_line = dd.display_replace_datetime(display_line);
            output_line = dd.output_replace_datetime(output_line);

            // Replace #DATE# - we are relying on #DATETIME already replaced
            display_line = dd.display_replace_date(display_line);
            output_line = dd.output_replace_date(output_line);

            // Replace #TIME...#
            display_line = dd.display_replace_time(display_line);
            output_line = dd.output_replace_time(output_line);

            // Replace **xxxx** with <b>xxxx</b>
            display_line = dd.display_replace_bold(display_line);

            // Replace *xxxx* with <i>xxxx</i>
            display_line = dd.display_replace_italic(display_line);

            // Replace https://foo.com with <a href="https://foo.com">https://foo.com</a>
            display_line = dd.display_replace_url(display_line);

            display_str += display_line + "\n";
            dd.discord_str += output_line + "\n";
        }
        dd.display_el.innerHTML = display_str;
    }

    // Replace #DATETIME# with e.g. "Sunday, 11 February 2024 14:00"
    display_replace_datetime(str) {
        let replaced_str = str;
        let time_pos = replaced_str.indexOf("#DATETIME");
        while (time_pos >= 0) {
            let time_end_pos = replaced_str.indexOf("#",time_pos+1);
            if (time_end_pos < 0) {
                break;
            }
            let time_str = replaced_str.slice(time_pos, time_end_pos+1);
            //console.log(`Datetime ${time_str} between ${time_pos} and ${time_end_pos}`);

            // Check for time adjustment
            let adjust_s = dd.get_adjust_s(time_str);

            let d = new Date(dd.datetime_js); // Avoid side-effect update of dd.datetime_s
            let adjusted_datetime_js = new Date(d.setSeconds(d.getSeconds() + adjust_s));

            const days = new Array("Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday");
            let day_of_week = days[adjusted_datetime_js.getDay()];
            let day_of_month = adjusted_datetime_js.getDate().toString();
            const months = new Array("January", "February", "March", "April", "May", "June", "July", "August", "September", "November", "December");
            let month = months[adjusted_datetime_js.getMonth()];
            let year = adjusted_datetime_js.getFullYear().toString();
            let time = ("0"+adjusted_datetime_js.getHours()).slice(-2) + ":" + ("0"+adjusted_datetime_js.getMinutes()).slice(-2);
            let datetime_str = day_of_week+", "+day_of_month+" "+month+" "+year+" "+time;

            replaced_str = replaced_str.slice(0,time_pos)+datetime_str+replaced_str.slice(time_end_pos+1);

            time_pos = replaced_str.indexOf("#DATETIME", time_pos);
        }
        return replaced_str;
    }

    output_replace_datetime(str) {
        let replaced_str = str;
        let time_pos = replaced_str.indexOf("#DATETIME");
        while (time_pos >= 0) {
            let time_end_pos = replaced_str.indexOf("#",time_pos+1);
            if (time_end_pos < 0) {
                break;
            }
            let time_str = replaced_str.slice(time_pos, time_end_pos+1);
            //console.log(`Datetime ${time_str} between ${time_pos} and ${time_end_pos}`);

            // Check for time adjustment
            let adjust_s = dd.get_adjust_s(time_str);

            let hammertime_str = "<t:"+(dd.unix_timestamp_int + adjust_s).toFixed(0)+":F>";

            replaced_str = replaced_str.slice(0,time_pos)+hammertime_str+replaced_str.slice(time_end_pos+1);

            time_pos = replaced_str.indexOf("#DATETIME", time_pos);
        }
        return replaced_str;
    }

    // Replace #DATE# with e.g. "11/02/2024" in locale date format
    display_replace_date(str) {
        let replaced_str = str;
        let time_pos = replaced_str.indexOf("#DATE"); // Note we are relying on #DATETIME already replaced
        while (time_pos >= 0) {
            let time_end_pos = replaced_str.indexOf("#",time_pos+1);
            if (time_end_pos < 0) {
                break;
            }
            let time_str = replaced_str.slice(time_pos, time_end_pos+1);
            console.log(`Date ${time_str} between ${time_pos} and ${time_end_pos}`);

            // Check for time adjustment
            let adjust_s = dd.get_adjust_s(time_str);

            let d = new Date(dd.datetime_js); // Avoid side-effect update of dd.datetime_s
            let adjusted_datetime_js = new Date(d.setSeconds(d.getSeconds() + adjust_s));

            let date_str = adjusted_datetime_js.toLocaleString().slice(0,10);

            replaced_str = replaced_str.slice(0,time_pos)+date_str+replaced_str.slice(time_end_pos+1);

            time_pos = replaced_str.indexOf("#DATE", time_pos);
        }
        return replaced_str;
    }

    // Replace #DATE# with e.g. "<t:1707909240:d>"
    output_replace_date(str) {
        let replaced_str = str;
        let time_pos = replaced_str.indexOf("#DATE"); // Note we are relying on #DATETIME already replaced
        while (time_pos >= 0) {
            let time_end_pos = replaced_str.indexOf("#",time_pos+1);
            if (time_end_pos < 0) {
                break;
            }
            let time_str = replaced_str.slice(time_pos, time_end_pos+1);
            //console.log(`Datetime ${time_str} between ${time_pos} and ${time_end_pos}`);

            // Check for time adjustment
            let adjust_s = dd.get_adjust_s(time_str);

            let hammertime_str = "<t:"+(dd.unix_timestamp_int + adjust_s).toFixed(0)+":d>";

            replaced_str = replaced_str.slice(0,time_pos)+hammertime_str+replaced_str.slice(time_end_pos+1);

            time_pos = replaced_str.indexOf("#DATE", time_pos);
        }
        return replaced_str;
    }

    // Replace #TIME# with e.g.  "18:45"
    // Replace #TIME+15" with    "19:00"
    // Replace #TIME+1:30# with  "20:15"
    // Replace #TIME-15# with    "18:30"
    display_replace_time(str) {
        let replaced_str = str;
        let time_pos = replaced_str.indexOf("#TIME");
        while (time_pos >= 0) {
            let time_end_pos = replaced_str.indexOf("#",time_pos+1);
            if (time_end_pos < 0) {
                break;
            }
            let time_str = replaced_str.slice(time_pos, time_end_pos+1);
            //console.log(`Time ${time_str} between ${time_pos} and ${time_end_pos}`);

            // Check for time adjustment
            let adjust_s = dd.get_adjust_s(time_str);

            let d = new Date(dd.datetime_js); // Avoid side-effect update of dd.datetime_s
            let adjusted_datetime_js = new Date(d.setSeconds(d.getSeconds() + adjust_s));

            let hh = ("0" + adjusted_datetime_js.getHours()).slice(-2);
            let mm = ("0" + adjusted_datetime_js.getMinutes()).slice(-2);

            replaced_str = replaced_str.slice(0,time_pos)+hh+":"+mm+replaced_str.slice(time_end_pos+1);

            time_pos = replaced_str.indexOf("#TIME", time_pos);
        }
        return replaced_str;
    }

    output_replace_time(str) {
        let replaced_str = str;
        let time_pos = replaced_str.indexOf("#TIME");
        while (time_pos >= 0) {
            let time_end_pos = replaced_str.indexOf("#",time_pos+1);
            if (time_end_pos < 0) {
                break;
            }
            let time_str = replaced_str.slice(time_pos, time_end_pos+1);
            //console.log(`Time ${time_str} between ${time_pos} and ${time_end_pos}`);

            // Check for time adjustment
            let adjust_s = dd.get_adjust_s(time_str);

            let hammertime_str = "<t:"+(dd.unix_timestamp_int + adjust_s).toFixed(0)+":t>";
            replaced_str = replaced_str.slice(0,time_pos)+hammertime_str+replaced_str.slice(time_end_pos+1);

            time_pos = replaced_str.indexOf("#TIME", time_pos);
        }
        return replaced_str;
    }

    display_replace_bold(str) {
        let replaced_str = str;
        let bold_pos = replaced_str.indexOf("**");
        while (bold_pos >= 0) {
            let bold_end_pos = replaced_str.indexOf("**",bold_pos+2);
            if (bold_end_pos < 0) {
                break;
            }
            let bold_str = replaced_str.slice(bold_pos, bold_end_pos+2);
            //console.log(`Bold ${bold_str} between ${bold_pos} and ${bold_end_pos}`);

            replaced_str = replaced_str.slice(0,bold_pos)+"<b>"+bold_str.slice(2,-2)+"</b>"+replaced_str.slice(bold_end_pos+2);

            bold_pos = replaced_str.indexOf("**", bold_pos);
        }
        return replaced_str;
    }

    display_replace_italic(str) {
        let replaced_str = str;
        let italic_pos = replaced_str.indexOf("*");
        while (italic_pos >= 0) {
            let italic_end_pos = replaced_str.indexOf("*",italic_pos+1);
            if (italic_end_pos < 0) {
                break;
            }
            let italic_str = replaced_str.slice(italic_pos, italic_end_pos+1);
            //console.log(`Italic ${italic_str} between ${italic_pos} and ${italic_end_pos}`);

            replaced_str = replaced_str.slice(0,italic_pos)+"<i>"+italic_str.slice(1,-1)+"</i>"+replaced_str.slice(italic_end_pos+1);

            italic_pos = replaced_str.indexOf("*", italic_pos);
        }
        return replaced_str;
    }

    display_replace_url(str) {
        let replaced_str = "";
        let rx = /(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])/g;
        let match;
        let str_index = 0;
        while (match = rx.exec(str)) {
            let url_str = match[0];
            //console.log(`url: [${match.index}..${match.index + match[0].length - 1}] ${url_str}`);
            replaced_str += str.slice(str_index, match.index);
            replaced_str += `<a href='${url_str}' target='_blank'>${url_str}</a>`;
            str_index = match.index + match[0].length;
        }
        replaced_str += str.slice(str_index);
        return replaced_str;
    }

    get_adjust_s(template_str) {
        let time_pos = template_str.indexOf("+");
        let adjust_sign = 1;
        if (time_pos < 0) {
            time_pos = template_str.indexOf("-");
            if (time_pos < 0) {
                return 0;
            }
            adjust_sign = -1;
        }

        // e.g. "#TIME+1:30#"
        // to "1:30"
        let adjust_str = template_str.slice(time_pos+1,-1);
        // to ["1", "30"] i.e. hours, minutes
        let adjust_parts = adjust_str.split(":");
        let adjust_s = parseInt(adjust_parts[adjust_parts.length - 1]) * 60; // add minutes
        if (adjust_parts.length == 2) {
            adjust_s += parseInt(adjust_parts[0]) * 3600; // add hours
        }
        if (isNaN(adjust_s)) {
            return 0;
        }
        return adjust_sign * adjust_s;
    }

    get_time_str(time_str) {
        return "XXX";
    }

    ui_hammertime_copy(el) {
        navigator.clipboard.writeText(el.innerText);
    }

    ui_click_copy(dd) {
        console.log("copy");
        navigator.clipboard.writeText(dd.discord_str);
    }

    ui_click_reset(dd) {
        console.log("reset");
        let template_str = localStorage.getItem("template_0");
        if (template_str != null && template_str != 'null') {
            dd.template_el.innerText = template_str;
            for (let i=0; i<dd.MAX_RESET; i++) {
                template_str = localStorage.getItem("template_"+i);
                localStorage.setItem("template_"+(i-1), template_str);
            }
            localStorage.setItem("template_"+(dd.MAX_RESET-1), 'null');
        } else {
            dd.template_el.innerText = DiscordDoc.initial_template_str;
        }
        dd.template_updated(dd);
    }

    ui_click_store(dd) {
        console.log("store");
        // Shuffle up existing stored entries
        for (let i=dd.MAX_RESET - 2; i>=0; i--) {
            let template_str = localStorage.getItem("template_"+i);
            if (template_str == null) {
                continue;
            }
            localStorage.setItem("template_"+(i+1), template_str);
        }
        localStorage.setItem("template_0", dd.template_str);
    }

    static initial_template_str = `SSC Task Title

#DATETIME#

**MSFS Server:** Southeast Asia

**Sim date/time:** Nov 11th 3pm local (i.e. 3pm *on day we are flying*)

**Max start:** 5000 Feet MSL

Distance is 300km, expected duration ~90 min

**Meet/Briefing:** #TIME#
At this time we meet in the voice chat and get ready. https://discord.com/channels/876123356385149009/876397825934626836

**Synchronized Fly:** #TIME+15#
At this time we simultaneously click the [FLY] button to sync our weather.

**Task Start:** #TIME+45#
At this time we cross the starting line and start the task.

A scenic trip out of Valparaiso, Chile.  Pilots who finish this task successfully during the event will be eligible to apply for the Silver Soaring Badge :silver:
`;

} // end class DiscordDoc
