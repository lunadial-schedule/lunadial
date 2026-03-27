const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\imhun\\Desktop\\lunadial\\src\\app\\calendar\\page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// The line we want to match:
// {event.is_all_day ? "종일" : format(parseISO(event.start_time), "HH:mm")}

const targetStr = '{event.is_all_day ? "종일" : format(parseISO(event.start_time), "HH:mm")}';
const replacement = `                               {event.is_all_day ? "종일" : format(parseISO(event.start_time), "HH:mm")}
                            </div>

                            {/* 프로필 이미지 */}
                            <div className="shrink-0 pt-0.5">
                              <Avatar className="h-7 w-7 border">
                                <AvatarImage src={event.streamers?.image_url || undefined} alt={event.streamer} />
                                <AvatarFallback className="text-[10px]">{event.streamer[0]}</AvatarFallback>
                              </Avatar>
                            </div>`;

// Find the line index
const lines = content.split('\n');
let foundIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes(targetStr)) {
    // Make sure it's the one in the Day View (around line 402)
    if (i > 380 && i < 420) {
      foundIdx = i;
      break;
    }
  }
}

if (foundIdx !== -1) {
  // We want to replace the line AND the following </div> line
  // Let's see if the next line is </div>
  if (lines[foundIdx + 1].includes('</div>')) {
    lines[foundIdx] = replacement;
    lines.splice(foundIdx + 1, 1); // remove the old </div> line
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log('Successfully updated file at line ' + (foundIdx + 1));
  } else {
    console.log('Found target but next line was not </div> at line ' + (foundIdx + 1));
  }
} else {
  console.log('Target string not found in the expected range.');
}
