"use client";

// Loads the Leaflet map (and its CSS) only when the Map tab is open, so the rest of /admin stays light.
import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type LeadMapType from "./LeadMap";

const LeadMap = dynamic(() => import("./LeadMap"), { ssr: false, loading: () => <p className="adm-muted">Loading the map…</p> });

const LeadMapLoader = (props: ComponentProps<typeof LeadMapType>) => <LeadMap {...props} />;

export default LeadMapLoader;
