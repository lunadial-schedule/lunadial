import re

file_path = r'c:\Users\imhun\Desktop\lunadial\src\app\calendar\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Target block
target = r'''                            <div className="flex items-start text-[13px] md:text-sm font-semibold shrink-0 pt\[1px\] text-foreground/80 w\[48px\] md:w\[56px\] whitespace-nowrap">
                               {event.is_all_day \? "종일" : format\(parseISO\(event.start_time\), "HH:mm"\)}
                            </div>'''

# Replacement
replacement = r'''                            <div className="flex items-start text-[13px] md:text-sm font-semibold shrink-0 pt[1px] text-foreground/80 w[48px] md:w[56px] whitespace-nowrap">
                               {event.is_all_day ? "종일" : format(parseISO(event.start_time), "HH:mm")}
                            </div>

                            {/* 프로필 이미지 */}
                            <div className="shrink-0 pt-0.5">
                              <Avatar className="h-7 w-7 border">
                                <AvatarImage src={event.streamers?.image_url || undefined} alt={event.streamer} />
                                <AvatarFallback className="text-[10px]">{event.streamer[0]}</AvatarFallback>
                              </Avatar>
                            </div>'''

# We use regex to be flexible with whitespace
pattern = re.compile(
    r'(\s+)<div className="flex items-start text-\[13px\] md:text-sm font-semibold shrink-0 pt\[1px\] text-foreground/80 w\[48px\] md:w\[56px\] whitespace-nowrap">\s+'
    r'\{event\.is_all_day \? "종일" : format\(parseISO\(event\.start_time\), "HH:mm"\)\}\s+'
    r'</div>',
    re.MULTILINE
)

new_content = pattern.sub(replacement, content)

if new_content == content:
    print("Failed to match pattern")
    # Try a simpler match if first one fails
    pattern_simple = re.compile(r'\{event\.is_all_day \? "종일" : format\(parseISO\(event\.start_time\), "HH:mm"\)\}')
    if pattern_simple.search(content):
        print("Simple pattern found, but full block match failed. Whitespace issue confirmed.")
    else:
        print("Simple pattern also not found. Content might have changed.")
else:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully updated file")
