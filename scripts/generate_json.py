import os
import json
import re
from datetime import datetime
from bs4 import BeautifulSoup

def get_meta_content(soup, attr_name, attr_value):
    tag = soup.find("meta", {attr_name: attr_value})
    if tag and tag.get("content"):
        return tag.get("content")
    return None

def convert_to_display_date(iso_date):
    months = {
        '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
        '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
        '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
    }
    try:
        dt = datetime.strptime(iso_date, "%Y-%m-%d")
        day = dt.day
        mon = months[dt.strftime("%m")]
        year = dt.year
        return f"{day} {mon} {year}"
    except:
        return iso_date

def main():
    base_dir = "/home/ubuntu/e-radiomagazine"
    articles_dir = os.path.join(base_dir, "articulos")
    output_path = os.path.join(base_dir, "data", "articles.json")
    
    category_label_map = {
        'anime': 'Anime', 'manga': 'Manga', 'videojuegos': 'Videojuegos',
        'cine': 'Cine', 'musica': 'Música', 'reviews': 'Reviews', 'game': 'Videojuegos'
    }
    
    articles = []
    
    for filename in os.listdir(articles_dir):
        if filename.endswith(".html"):
            file_path = os.path.join(articles_dir, filename)
            with open(file_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            soup = BeautifulSoup(html_content, 'html.parser')
            
            title = get_meta_content(soup, "property", "og:title") or get_meta_content(soup, "name", "og:title")
            description = get_meta_content(soup, "property", "og:description") or get_meta_content(soup, "name", "og:description")
            img = get_meta_content(soup, "property", "og:image") or get_meta_content(soup, "name", "og:image")
            category = get_meta_content(soup, "name", "article:category")
            published = get_meta_content(soup, "name", "article:published_time")
            
            if not title:
                print(f"WARN: No title in {filename}, skipping")
                continue
                
            # If no published date, use file modification time
            if not published:
                mtime = os.path.getmtime(file_path)
                published = datetime.fromtimestamp(mtime).strftime("%Y-%m-%d")
                # Optionally add the meta tag to the file here, but let's just focus on the JSON first
            
            if not category:
                category = "anime"
                
            display_date = convert_to_display_date(published)
            cat_label = category_label_map.get(category, category.capitalize())
            
            if not img:
                img = "https://leolarata35.github.io/e-radiomagazine/assets/default.png"
                
            articles.append({
                "category": category,
                "img": img,
                "date": display_date,
                "categoryLabel": cat_label,
                "title": title,
                "description": description,
                "href": f"articulos/{filename}",
                "sortDate": published
            })
    
    # Sort by date descending
    articles.sort(key=lambda x: x['sortDate'], reverse=True)
    
    # Remove sortDate for final JSON
    final_articles = []
    for a in articles:
        clean_a = a.copy()
        del clean_a['sortDate']
        final_articles.append(clean_a)
        
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(final_articles, f, indent=4, ensure_ascii=False)
        
    print(f"OK: {len(final_articles)} articles -> {output_path}")

if __name__ == "__main__":
    main()
