#!/usr/bin/env bash

shopt -s globstar extglob

NAME=$(basename "$0")
ROOT=$(dirname "$(dirname "$(readlink -f "$0")")")
PORT_FORWARDER=$(wslpath -aw "$ROOT"/port-forwarder.ps1 2>/dev/null)

function print_red() { printf '\e[1;31m%b%s\e[0m' "$1"; }
function print_blue() { printf '\e[1;36m%b%s\e[0m' "$1"; }
function read_blue() { read -p $'\e[1;36m'"$1"$'\e[0m' "$2"; }

# Checks whether script is running on "WSL"
function assert_wsl() {
    if ! grep -qi microsoft /proc/version &>/dev/null; then
        print_red ">> This script must run on Windows Subsystem for Linux\n"
        exit 1
    fi
}

# Exports development environment to the "Windows Terminal"
function windows_terminal() {
    assert_wsl
    local args_trimmed=''
    for arg in "$1"; do
        if [[ $arg == --* ]]; then
            [[ $arg != '--windows-terminal' ]] && args_trimmed+=" $arg"
        elif [[ $arg == -* ]]; then
            arg=$(sed 's/t//g' <<< "$arg")
            [[ $arg != '-' ]] && args_trimmed+=" $arg"
        fi
    done

    powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden \
        wt.exe "--window 0 new-tab --profile $WSL_DISTRO_NAME --title Soberia.ir \
                --tabColor '#025338' --suppressApplicationTitle \
                wsl.exe -e bash -c '"$ROOT/bin/$NAME" $args_trimmed\; exec bash'"
}

# Installs project required dependencies
function setup() {
    local refreshed=false

    if ! apt -v &>/dev/null; then
        print_red ">> APT package manager is not available on the system\n"
        exit 1
    fi

    # Installing "Node.js"
    if ! node -v &>/dev/null; then
        if ! curl -V &>/dev/null; then
            sudo apt-get update; refreshed=true
            sudo apt-get -y install curl
        fi
        curl -sL https://deb.nodesource.com/setup_current.x | sudo -E bash -
        ! $refreshed && sudo apt-get update; refreshed=true
        sudo apt-get install -y nodejs
    fi

    # Installing required packages
    if [ ! -d "$ROOT"/node_modules ]; then
        npm install --prefix "$ROOT"
    fi

    # Installing "cwebp"
    if ! cwebp -version &>/dev/null; then
        ! $refreshed && sudo apt-get update
        sudo apt-get -y install webp
    fi

    if ! $refreshed; then
        print_blue ">> All required dependencies are satisfied\n"
    fi
}

# Runs TypeScript modules
function typescript_run() {
    cd "$ROOT"
    npx tsc --module nodenext --moduleResolution nodenext "$1.mts"
    node --experimental-modules "$1.mjs" # cat "$1.js" | node --input-type module
    rm "$1.mjs"
}

# Calculates project source lines of code
function sloc() {
    local a=$(wc -l "$ROOT"/{!(package-lock),''}.{json,env,babelrc,toml} 2>&1 |
        tail -1 | grep -Po '\d+')
    local b=$(wc -l "$ROOT"/{bin,src}/**/*.{css,js,ts,tsx,mts,sh,ps1} 2>&1 |
        tail -1 | grep -Po '\d+')
    local c=$(wc -l "$ROOT"/public/*.html 2>&1 |
        tail -1 | grep -Po '\d+')

    print_blue ">> PROJECT SOURCE LINE OF CODES: "
    printf "$((a + b + c))\n"
}

# Generates project backup archive
function backup() {
    local base=$(basename "$ROOT")
    local backup=~/soberia.ir-$(date +%m.%d.%y).tar.gz
    XZ_OPT=-9 tar --exclude="$base"/{build,node_modules,package-lock.json} \
        -Jcpf $backup -C $(dirname "$ROOT") "$base"

    print_blue ">> $(du -sh $backup)\n"
}

# Generates production ready files
function production_builder() {
    cd "$ROOT"
    typescript_run "$ROOT"/bin/blog-reference-generator
    npx matchmoji-generate "$ROOT"/public/game
    npx react-app-rewired build

    # Updating service worker's cached URLs
    local extension file
    for extension in "css" "js"; do
        for file in "$ROOT"/build/static/$extension/*.$extension; do
            file=$(basename $file)
            if [[ $file == main* ]]; then
                sed -i "s/main.$extension/$file/" "$ROOT"/build/game/service-worker.js
            elif [[ $file == *chunk* ]]; then
                # Adding lazy loaded chunks
                sed -i "s/$extension'},/&{revision:null,url:'\/static\/$extension\/$file'},/" \
                    "$ROOT"/build/game/service-worker.js
            fi
        done
    done

    # Removing SVG files and their footprint
    rm -R "$ROOT"/build/static/media/*.svg
    sed -Ei '/.svg",?$/d' "$ROOT"/build/asset-manifest.json
    sed -zi 's/,\(\n\s*}\)/\1/g' "$ROOT"/build/asset-manifest.json # Removing trailing commas
}

# Converts project images to WebP format
function image_converter() {
    local quality="$1"
    if ! [[ "$quality" =~ ^[0-9]+$ ]] ||
        (( $quality < 0 || $quality > 100 )); then
        print_red ">> Invalid argument!\n"
        return 2
    fi

    local answer
    read_blue ">> All original image files will be deleted after conversion, continue? (y/n) " answer
    if [[ $answer = 'y' ]]; then
        local image
        local count=0
        local size=$(du -sc "$ROOT"/{public,src}/**/*.{webp,png,jp*g} 2>&1 |
            tail -1 | grep -Po '\d+')
        for image in "$ROOT"/{public,src}/**/*.{webp,png,jp*g}; do
            if [ -f "$image" ]; then
                local filename=$(basename "$image")

                # Existing lossless WebP images also should be compressed,
                # determining lossy files by inspecting header section of the file.
                # See https://developers.google.com/speed/webp/docs/riff_container
                local is_webp=$([[ ${filename##*.} = 'webp' ]] && echo true || echo false)
                if $is_webp; then
                    local byte_16th=$(xxd -p -s 15 -l1 "$image")
                    if [[ $((16#$byte_16th)) -eq $((16#58)) ]]; then
                        # Extended File Format
                        [[ $(grep -c 'VP8L' "$image") = 0 ]] && continue
                    elif [[ $((16#$byte_16th)) -ne $((16#4C)) ]]; then
                        # Simple File Format (Lossy)
                        continue
                    fi
                fi

                cwebp -mt -quiet -jpeg_like -metadata icc -pass 10 -m 6 -q $quality $image \
                    -o "$(dirname $image)/${filename%.*}.webp"
                [ $? != 0 ] && return 1

                $is_webp || rm $image
                ((count++))
            fi
        done

        local new_size=$(du -sc "$ROOT"/{public,src}/**/*.webp 2>&1 |
            tail -1 | grep -Po '\d+')
        print_blue ">> $count images converted to WebP format, "
        print_blue "$(( $size - $new_size ))KB size reduced ("$size"KB -> "$new_size"KB)\n"
    fi
}

# Parsing arguments
args_origin="$*"
args=$(getopt --options="hvtf" --longoptions="help,version,windows-terminal, \
    forward-ports,setup,sloc,backup,production-builder,blog-reference-generator, \
    image-converter::" --name="$NAME" -- "$@")
[ $? != 0 ] && exit 2
eval set -- "$args" # Handling quotes

app="Soberia.ir v$(grep -Po '"version": "\K(.*\d)' "$ROOT"/package.json)"
help=$(cat << EOL
$app

Usage:
    $NAME [Options]...
    $NAME [Tools]...

Options:
    -h, --help                      Display this help and exit
    -v, --version                   Display application version and exit
    -t, --windows-terminal          Use external Windows Terminal (only on WSL)
    -f, --forward-ports             Accessible development environment on host's local
                                    network (only on WSL)

Tools:
    --setup                         Install project required dependencies (Node.js + cwebp)
    --sloc                          Calculate project source lines of code
    --backup                        Generate project backup archive
    --production-builder            Generate production ready files
    --blog-reference-generator      Generate blog articles references
    --image-converter <NUM>         Convert project images to WebP format,
                                    existing lossless WebP images also will be compressed,
                                    compression quality can be provided, default is 95
EOL
)

forward_ports=false
while true; do
    case "$1" in
    -h | --help ) echo "$help"; exit;;
    -v | --version ) echo "$app"; exit;;
    -t | --windows-terminal ) windows_terminal "$args_origin"; exit;;
    -f | --forward-ports ) forward_ports=true; shift;;
    --setup ) setup; exit;;
    --sloc ) sloc; exit;;
    --backup ) backup; exit;;
    --production-builder ) production_builder; exit;;
    --blog-reference-generator ) typescript_run "$ROOT"/bin/blog-reference-generator; exit;;
    --image-converter ) image_converter "${2:-95}"; exit;;
    -- ) shift; break;;
    * ) exit 2;;
    esac
done

# Forwarding development server's ports
if $forward_ports; then
    assert_wsl
    print_blue ">> Development environment started with forwarded ports\n"
    powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden \
        -File $PORT_FORWARDER -Silent
    # Closing opened ports on Ctrl+C
    trap cleanup SIGINT
    function cleanup() {
        powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden \
            -File $PORT_FORWARDER -Close -Silent
    }
fi

# Starting development server
npm start --prefix "$ROOT"
