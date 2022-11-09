// ******************************************************************************
// ***********   WP class (waypoint)       **************************************
// ******************************************************************************

class B21_WP {

    // Waypoint may be created by a click on the map:
    //          new WP(planner, index, position)
    // or as a result of loading an MSFS flightplan:
    //          new WP(planner,index,null,WP_dom_object)
    //
    constructor(planner) {
        this.planner = planner; // reference to B21TaskPlanner instance

        this.DEFAULT_RADIUS_M = 500;
        this.DEFAULT_START_RADIUS_M = 2500;
        this.DEFAULT_FINISH_RADIUS_M = 2000;
    }

    new_point(index, position) {
        console.log("new WP", index, position, name);

        this.name = null;
        this.position = position;
        this.icao = null;
        this.data_icao = null; // original ICAO code from source data (may not use in output PLN if not first/last waypoint)
        this.runway = null; // Selected runway
        this.runways = null; // List of available runways
        this.alt_m = 0;
        this.alt_m_updated = false; // true is elevation has been updated
        this.radius_m = null;
        this.max_alt_m = null;
        this.min_alt_m = null;
        // turnpoint sector (Leaflet circle)
        this.sector = null;

        // Values from task
        // Note each 'leg_' value is TO this waypoint
        this.index = index;
        this.task_line = null; // holds [L.polyline, L.polyline] used in task.js to draw task on map
        this.leg_bearing_deg = null; // Bearing from previous WP to this WP
        this.leg_distance_m = null; // Distance (meters) from previous WP to this WP
        this.marker = this.create_marker();
    }

    copy(index) {
        console.log("copying wp",this.index,"into new",index);
        let wp = new B21_WP(this.planner);
        wp.index = index;
        wp.position = this.position;
        wp.name = this.name;
        wp.alt_m = this.alt_m;
        wp.icao = this.icao;
        wp.runways = this.runways;
        wp.marker = this.create_marker();
        return wp;
    }

    create_marker() {
        let parent = this;

        let marker = L.marker(this.position, {
            icon: parent.get_icon(parent),
            draggable: true,
            autoPan: true
        });
        marker.on("dragstart", function(e) {
            parent.planner.map.closePopup();
        });
        marker.on("drag", function(e) {
            let marker = e.target;
            parent.position = marker.getLatLng();
            parent.planner.task.update_waypoints();
            parent.planner.task.redraw();
            parent.planner.task.display_task_info();
        });
        marker.on("dragend", function(e) {
            parent.planner.task.set_current_wp(parent.index);
            console.log("WP dragend");
            let marker = e.target;
            parent.planner.request_alt_m(parent, parent.position, parent.request_alt_m_ok, parent.request_alt_m_fail);
        });

        //marker.on("click", function(e) {
        //    this.openPopup();
        //    return;
        //    parent.wp_click(parent, e);
        //});

        // POPUP
        console.log("creating WP popup",this.get_name());
        var popup = L.popup({
                offset: [20, 10],
                className: "wp_popup",
                autoClose: false
            })
            .setContent("no WP content yet");

        marker.bindPopup(popup);

        marker.on('popupopen', () => {
            console.log("marker event on popupopen");
            parent.planner.task.set_current_wp(parent.index);
        });

        marker.addTo(this.planner.map);

        return marker;
    }

    wp_click(parent, e) {
        console.log("wp_click");
        parent.planner.task.set_current_wp(parent.index);
    }

    // The ap "icon" is the permanently displayed div containing the name
    get_icon(parent) {
        //let icon_str = '<div onclick="b21_task_planner.task.set_current_wp(0);">';
        let icon_str = ((1 + parent.index) + "." + parent.get_name()).replaceAll(" ", "&nbsp;");
        //icon_str += "</div>";
        let class_name = (parent.planner.task.index == parent.index) ? "wp_icon_html_current" : "wp_icon_html";
        let icon_html = '<div class="' + class_name + '">' + icon_str + "</div>";
        let wp_icon = L.divIcon({
            className: "wp_icon",
            iconSize: [5, 5],
            iconAnchor: [0, 0],
            html: icon_html
        });

        return wp_icon;
    }

    request_alt_m_ok(parent, position, alt_m) {
        console.log("wp.request_alt_m_ok elevation(m):", position, alt_m);
        parent.alt_m = alt_m;
        parent.alt_m_updated = true;
        // If this is the current waypoint, popup the wp menu
        if (parent.index == parent.planner.task.index) {
            parent.display_menu(parent);
        }
        parent.planner.task.display_task_info();
    }

    request_alt_m_fail(parent, position, error_str, error) {
        console.log("WP alt_m fetch error", error_str, error);
    }

    is_task_start() {
        return this.index == this.planner.task.start_index;
    }

    is_task_finish() {
        return this.index == this.planner.task.finish_index;
    }

    get_name() {
        if (this.name == null) {
            return "WP " + this.index;
        }
        return this.name;
    }

    set_name(name) {
        let parent = this;
        parent.name = name;
        parent.update_icon(parent);
    }

    get_icao() {
        return this.icao == null ? "" : this.icao;
    }

    set_icao(icao) {
        let parent = this;
        console.log("wp.set_icao", icao);
        if (icao == "") {
            console.log("setting icao to null");
            parent.icao = null;
        } else {
            console.log("setting icao to '" + icao + "'");
            parent.icao = icao;
            if (parent.name == null) {
                parent.name = parent.icao;
                document.getElementById("wp_name").value = parent.icao;
            }
        }
        parent.update_icon(parent);
    }

    get_runway() {
        return this.runway == null ? "" : this.runway;
    }

    set_runway(runway) {
        this.runway = runway;
    }

    set_radius(radius_m) {
        this.radius_m = radius_m;
    }

    // return Wp radius in meters
    get_radius() {
        if (this.radius_m != null) return this.radius_m;
        if (this.is_task_start()) return this.DEFAULT_START_RADIUS_M;
        if (this.is_task_finish()) return this.DEFAULT_FINISH_RADIUS_M;
        return this.DEFAULT_RADIUS_M;
    }

    get_leg_bearing() {
        if (this.leg_bearing_deg == null) {
            return "";
        }
        return this.leg_bearing_deg.toFixed(0);
    }

    update(prev_wp = null) {
        //console.log("update",this.index);
        if (prev_wp != null) {
            this.update_leg_distance(prev_wp);
            this.update_leg_bearing(prev_wp);
        }
    }

    // Add .leg_distance_m property for distance (meters) from wp to this waypoint
    // Called when task is loaded
    update_leg_distance(prev_wp) {
        this.leg_distance_m = Geo.get_distance_m(this.position, prev_wp.position);
        //console.log("update_leg_distance", this.index, this.leg_distance_m);
    }

    // Add .bearing property for INBOUND bearing FROM wp TO this waypoint
    // Called when task is loaded
    update_leg_bearing(prev_wp) {
        this.leg_bearing_deg = Geo.get_bearing_deg(prev_wp.position, this.position);
    }

    update_icon(parent) {
        console.log("update_icon for wp",parent.index);
        let icon = parent.get_icon(parent);
        parent.marker.setIcon(icon);
    }

    display_menu(parent) {
        console.log("wp.display_menu()");
        // NAME
        let form_str = 'Name: <input id="wp_name" class="wp_name" onchange="b21_task_planner.change_wp_name(this.value)" value="' + parent.get_name() +
            '"</input>';

        // ICAO
        form_str += '<br/>ICAO: <input class="wp_icao" onchange="b21_task_planner.change_wp_icao(this.value)" value="' + parent.get_icao() +
            '"</input> ';

        // RUNWAY
        form_str +=
            ' Runway: <input id="wp_runway" class="wp_runway" onchange="b21_task_planner.change_wp_runway(this.value)" value="' +
            parent.get_runway() + '"</input> ';
        if (parent.runways != null) {
            form_str += '<select class="wp_runway_select" onchange="b21_task_planner.select_wp_runway(this.value)" value="">';
            for (let i = 0; i < parent.runways.length; i++) {
                form_str += '<option>' + parent.runways[i] + '</option>';
            }
            form_str += '<option></option>'; // Add 'blank' option for no runway selected
            form_str += '</select>';
        }

        // ELEVATION
        let alt_str = parent.alt_m.toFixed(0);
        let alt_units_str = "m.";
        if (parent.planner.settings.altitude_units == "feet") {
            alt_str = (parent.alt_m * parent.planner.M_TO_FEET).toFixed(0);
            alt_units_str = "feet.";
        }

        form_str += '<br/>Elevation: <input class="wp_alt" onchange="b21_task_planner.change_wp_alt(this.value)" value="' +
            alt_str + '"</input> ' + alt_units_str;

        // settings.soaring_task == true . It's a placeholder in case we want planner for non-soaring.
        if (parent.planner.settings.soaring_task == 1) {
            // START checkbox
            let start = parent.index == parent.planner.task.start_index;
            form_str += '<br/><div class="wp_start">Start: <input onclick="b21_task_planner.click_start(this)" type="checkbox"' + (start ? " checked" :
                "") + '/></div> ';

            // FINISH checkbox
            let finish = parent.index == parent.planner.task.finish_index;
            form_str += '<div class="wp_finish">Finish: <input  onclick="b21_task_planner.click_finish(this)" type="checkbox"' + (finish ? " checked" :
                "") + '/></div>';

            // RADIUS
            let radius_units_str = "m";
            if (parent.planner.settings.wp_radius_units == "feet") {
                radius_units_str = "feet";
            }
            let radius_str = "";
            if (parent.radius_m != null) {
                if (parent.planner.settings.wp_radius_units == "m") {
                    radius_str = parent.radius_m.toFixed(0);
                } else {
                    radius_str = (parent.radius_m * parent.planner.M_TO_FEET).toFixed(0);
                }
            }
            form_str += ' Radius: <input class="wp_radius" onchange="b21_task_planner.change_wp_radius(this.value)" value="' +
                radius_str + '"</input> ' + radius_units_str;

            // MAX ALT LIMIT
            let max_alt_str = "";
            if (parent.max_alt_m != null) {
                if (parent.planner.settings.altitude_units == "m") {
                    max_alt_str = parent.max_alt_m.toFixed(0);
                } else {
                    max_alt_str = (parent.max_alt_m * parent.planner.M_TO_FEET).toFixed(0);
                }
            }
            form_str += '<br/>Max Alt: <input class="wp_alt" onchange="b21_task_planner.change_wp_max_alt(this.value)" value="' +
                max_alt_str + '"</input> ';

            // MIN ALT LIMIT
            let min_alt_str = "";
            if (parent.min_alt_m != null) {
                if (parent.planner.settings.altitude_units == "m") {
                    min_alt_str = parent.min_alt_m.toFixed(0);
                } else {
                    min_alt_str = (parent.min_alt_m * parent.planner.M_TO_FEET).toFixed(0);
                }
            }
            form_str += ' Min Alt: <input class="wp_alt" onchange="b21_task_planner.change_wp_min_alt(this.value)" value="' +
                min_alt_str + '"</input> ' + alt_units_str;
        }

        // MENU items
        form_str += '<div class="wp_menu">';
        form_str += parent.planner.menuitem("Append to task", "duplicate_wp_to_task");
        form_str += parent.planner.menuitem("Update elevation", "update_wp_elevation");
        form_str += parent.planner.menuitem('<img src="images/delete.png"/>', "remove_wp_from_task");
        form_str += '</div>';

        // POPUP
        parent.marker.getPopup().setContent(form_str);
        console.log("opening popup");
        parent.marker.openPopup();
    }

    // ********************************************
    // Tracklog calculations
    // Points are { lat, lng, alt_m }
    // ********************************************


    // is_start(p1, p2, leg_bearing) returns true if p1->p2 crosses the start line
    is_start(p1, p2, leg_bearing_deg) {
        //console.log("WP.is_start()");

        // Check p1 is in start sector
        if (this.max_alt_m != null && p1.alt_m > this.max_alt_m) {
            //console.log("WP.is_start() false p1 max_alt_m="+this.max_alt_m+" vs "+p1.alt_m);
            return false;
        }
        if (this.min_alt_m != null && p1.alt_m < this.min_alt_m) {
            //console.log("WP.is_start() false p1 min_alt_m="+this.min_alt_m+" vs "+p1.alt_m);
            return false;
        }

        let radius_m = this.radius_m == null ? this.DEFAULT_START_RADIUS_M : this.radius_m;
        let p1_distance_m = Geo.get_distance_m(p1, this.position);
        if (p1_distance_m > radius_m) {
            //console.log("WP.is_start() false radius_m="+radius_m.toFixed(0)+" vs "+distance_m.toFixed(0));
            return false;
        }
        let wp_bearing_deg = Geo.get_bearing_deg(p1, this.position);
        let in_sector = Geo.in_sector(leg_bearing_deg, wp_bearing_deg, 180); // Check p1 within start sector angles
        if (!in_sector) {
            //console.log("WP.is_start() false p1 at "+wp_bearing_deg.toFixed(0)+" deg not in start sector");
            return false;
        }
        // OK so p1 is in the start sector, now we need to see if p2 is outside i.e. distance>radius or crosses the start line
        // We do this by seeing if p2 is in the 180-degree sector OPPOSITE the start sector
        // First check radius:
        if (Geo.get_distance_m(p2, this.position) > radius_m) {
            return true;
        }
        // Inside radius, but have we crossed start line?
        let reverse_bearing_deg = (leg_bearing_deg + 180) % 360;
        wp_bearing_deg = Geo.get_bearing_deg(p2, this.position);
        let over_start_line = Geo.in_sector(reverse_bearing_deg, wp_bearing_deg, 180);
        if (over_start_line) {
            //console.log("WP.is_start true at " + wp_bearing_deg.toFixed(0));
        } else {
            //console.log("WP.is_start false at "+wp_bearing_deg.toFixed(0));
        }
        return over_start_line;
    }

    is_finish(p1, p2) {
        //console.log("wp is_finish");

        // check p1 is before finish sector
        let wp_bearing_deg = Geo.get_bearing_deg(p1, this.position);
        let before_finish_line = Geo.in_sector(this.leg_bearing_deg, wp_bearing_deg, 180);
        if (before_finish_line) {
            //console.log("WP.is_finish p1 before_finish_line=true at "+wp_bearing_deg.toFixed(0));
        } else {
            //console.log("WP.is_finish p1 before_finish_line=false at "+wp_bearing_deg.toFixed(0));
            return false;
        }
        // p1 is before finish

        // Check p2 is in finish sector
        if (this.max_alt_m != null && p2.alt_m > this.max_alt_m) {
            //console.log("WP.is_finish() false p2 max_alt_m="+this.max_alt_m+" vs "+p2.alt_m);
            return false;
        }
        if (this.min_alt_m != null && p2.alt_m < this.min_alt_m) {
            //console.log("WP.is_finish() false p2 min_alt_m="+this.min_alt_m+" vs "+p2.alt_m);
            return false;
        }

        let radius_m = this.radius_m == null ? this.DEFAULT_FINISH_RADIUS_M : this.radius_m;
        let distance_m = Geo.get_distance_m(p2, this.position);
        if (distance_m > radius_m) {
            //console.log("WP.is_finish() false p2 radius_m="+radius_m.toFixed(0)+" vs "+distance_m.toFixed(0));
            return false;
        }

        let reverse_bearing_deg = (this.leg_bearing_deg + 180) % 360;
        wp_bearing_deg = Geo.get_bearing_deg(p2, this.position);
        let p2_in_sector = Geo.in_sector(reverse_bearing_deg, wp_bearing_deg, 180); // Check p2 within finish sector angles
        if (!p2_in_sector) {
            //console.log("WP.is_finish() false p2 at "+wp_bearing_deg.toFixed(0)+" deg not in finish sector");
            return false;
        }

        //console.log("WP.is_finish() true");

        return true;
    }

    is_wp(p1, p2) {
        if (!this.in_wp_sector(p1) && this.in_wp_sector(p2)) {
            //console.log("wp is_wp() true");
            return true;
        }
        //console.log("wp is_wp() false");
        return false;
    }

    in_wp_sector(p) {
        //console.log("in_wp_sector");
        if (this.max_alt_m != null && p.alt_m > this.max_alt_m) {
            //console.log("in_wp_sector false max_alt_m="+this.max_alt_m+" vs "+p.alt_m);
            return false;
        }
        if (this.min_alt_m != null && p.alt_m < this.min_alt_m) {
            //console.log("in_wp_sector false min_alt_m="+this.min_alt_m+" vs "+p.alt_m);
            return false;
        }
        let radius_m = this.radius_m == null ? this.DEFAULT_RADIUS_M : this.radius_m;
        let distance_m = Geo.get_distance_m(p, this.position);
        let in_sector = distance_m < radius_m;
        //console.log("in_wp_sector "+in_sector+" radius_m="+radius_m+" vs "+distance_m.toFixed(1));
        return in_sector;
    }

    // ********************************************
    // class toString
    // ********************************************

    toString() {
        return this.name;
    }
} // end WP class
