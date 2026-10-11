import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors } from '@/theme';

export interface MapPin {
  key: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Pin colour: green for halal, amber for options, brown for mosques, grey for "may stock". */
  color: string;
  subtitle: string;
}

/**
 * A map of places using Leaflet and OpenStreetMap tiles inside a WebView, so it
 * works on iPhone and Android without map API keys. Tapping a pin's label calls
 * onSelect with the pin's key.
 */
export function PlacesMap({
  center,
  radiusKm,
  pins,
  onSelect,
}: {
  center: { latitude: number; longitude: number };
  radiusKm: number;
  pins: MapPin[];
  onSelect: (key: string) => void;
}) {
  const html = useMemo(() => {
    const data = JSON.stringify({ center: [center.latitude, center.longitude], radius: radiusKm * 1000, pins }).replace(/</g, '\\u003c');
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#m{margin:0;height:100%;font-family:-apple-system,Roboto,sans-serif}
.p{font-weight:700;font-size:14px;margin-bottom:2px}.s{color:#7a6a60;font-size:12px}
.go{display:inline-block;margin-top:6px;color:#6B4F3A;font-weight:700;font-size:13px}</style></head>
<body><div id="m"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
var d=${data};
var map=L.map('m',{zoomControl:false}).setView(d.center,13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
var c=L.circle(d.center,{radius:d.radius,color:'#6B4F3A',weight:1,fillOpacity:0.04}).addTo(map);
L.circleMarker(d.center,{radius:7,color:'#fff',weight:2,fillColor:'#2F6FED',fillOpacity:1}).addTo(map);
function esc(t){return String(t).replace(/[&<>"]/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]})}
d.pins.forEach(function(p){
  var m=L.circleMarker([p.latitude,p.longitude],{radius:8,color:'#fff',weight:2,fillColor:p.color,fillOpacity:1}).addTo(map);
  m.bindPopup('<div class="p">'+esc(p.name)+'</div><div class="s">'+esc(p.subtitle)+'</div><a class="go" href="#" data-k="'+esc(p.key)+'">Directions ›</a>');
});
document.addEventListener('click',function(e){var k=e.target&&e.target.getAttribute&&e.target.getAttribute('data-k');if(k){e.preventDefault();window.ReactNativeWebView.postMessage(k);}});
map.fitBounds(c.getBounds(),{padding:[10,10]});
</script></body></html>`;
  }, [center.latitude, center.longitude, radiusKm, pins]);

  return (
    <View style={styles.wrap}>
      <WebView
        originWhitelist={['*']}
        // A real origin and app name, as OpenStreetMap's tile policy asks.
        source={{ html, baseUrl: 'https://firdam.com' }}
        applicationNameForUserAgent="Firdam/1.0"
        onMessage={(e) => onSelect(e.nativeEvent.data)}
        setSupportMultipleWindows={false}
        style={{ backgroundColor: colors.linen }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 380, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
});
