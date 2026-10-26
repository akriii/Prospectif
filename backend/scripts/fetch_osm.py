import urllib.request
import urllib.parse
import json
import os

def fetch_overpass_data(query, filename):
    url = "https://overpass-api.de/api/interpreter"
    data = urllib.parse.urlencode({'data': query}).encode('utf-8')
    
    # Identify our app to bypass the Overpass API bot blocker
    headers = {
        'User-Agent': 'ProspectifAI-Hackathon/1.0 (Student Project)',
        'Accept': 'application/json'
    }
    
    print(f"Fetching data for {filename}...")
    
    try:
        req = urllib.request.Request(url, data=data, headers=headers)
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            # Extract clean coordinates and names
            points = []
            for element in result.get('elements', []):
                lat = element.get('lat') or element.get('center', {}).get('lat')
                lon = element.get('lon') or element.get('center', {}).get('lon')
                name = element.get('tags', {}).get('name', 'Unnamed Location')
                
                if lat and lon:
                    points.append({"name": name, "lat": lat, "lon": lon})
            
            # Save directly into your backend/data folder
            filepath = os.path.join("data", filename)
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(points, f, indent=4)
            print(f"Success: Saved {len(points)} locations to {filepath}\n")
            
    except Exception as e:
        print(f"Error fetching {filename}: {e}\n")

if __name__ == "__main__":
    # Base search area: Perak State boundaries
    base_area = 'area["name"="Perak"]["admin_level"="4"]->.searchArea;'
    
    # 1. Lifestyle Coordinates (Cafes and Malls)
    lifestyle_query = f"""
    [out:json][timeout:25];
    {base_area}
    (
      node["amenity"="cafe"](area.searchArea);
      node["shop"="mall"](area.searchArea);
      way["shop"="mall"](area.searchArea);
      way["building"="retail"](area.searchArea);
    );
    out center;
    """
    
    # 2. Talent/Education Coordinates (Universities and Colleges)
    edu_query = f"""
    [out:json][timeout:25];
    {base_area}
    (
      node["amenity"="university"](area.searchArea);
      node["amenity"="college"](area.searchArea);
      way["amenity"="university"](area.searchArea);
      way["amenity"="college"](area.searchArea);
    );
    out center;
    """

    # 3. Industry Coordinates (Industrial Parks and Zones)
    industry_query = f"""
    [out:json][timeout:25];
    {base_area}
    (
      way["landuse"="industrial"](area.searchArea);
      node["landuse"="industrial"](area.searchArea);
    );
    out center;
    """

    print("Starting OpenStreetMap extraction for Perak...\n")
    fetch_overpass_data(lifestyle_query, "lifestyle_points.json")
    fetch_overpass_data(edu_query, "education_points.json")
    fetch_overpass_data(industry_query, "industry_points.json")
    
    print("Data extraction complete. Map anchors secured.")