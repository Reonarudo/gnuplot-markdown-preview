"""Generate a dependency-free, antialiased 128px plot icon."""
import math, struct, zlib
size, scale = 128, 4
pixels = []
for y in range(size):
    for x in range(size):
        colors = []
        for sy in range(scale):
            for sx in range(scale):
                px, py = x+(sx+.5)/scale, y+(sy+.5)/scale
                c = (20, 33, 54)
                if (abs(px-26)<1.3 and 22<py<105) or (abs(py-91)<1.3 and 19<px<112): c=(169,191,214)
                if 27<px<111:
                    curve=63-25*math.sin((px-29)/16)
                    if abs(py-curve)<3: c=(65,220,180)
                colors.append(c)
        pixels.extend(round(sum(c[i] for c in colors)/len(colors)) for i in range(3))
def chunk(kind, data):
    return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
raw=b''.join(b'\0'+bytes(pixels[y*size*3:(y+1)*size*3]) for y in range(size))
with open('media/icon.png','wb') as f:
    f.write(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b''))
