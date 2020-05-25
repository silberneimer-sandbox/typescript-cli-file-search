import React from "react";
import { render } from "ink";
import { Text, Box, Color } from "ink";
import * as fs from "fs";

type Item = {
    path: string, 
    stats: fs.Stats
}

const searchPath = "./"
const ignoreItems = [".git", "node_modules"]

main();
searchRecursiveFiles(searchPath, (searchItem) => {
    return !shouldIgnore(ignoreItems, searchItem, (ignoreItem, searchItem) => {
        return searchItem.path.startsWith(searchPath + ignoreItem)
    })
}).then((ret) => {
    console.log("Retrieved search file count: ", ret.length)
})

function main() {
    render(
        <Box margin={1}>
            <Color yellowBright>
                <Text bold>Hello, React Ink CLI App!</Text>
            </Color>
        </Box>
    );
}

/**
 * 指定したディレクトリのファイル、ディレクトリなどの名前の一覧を取得する
 * @param path 一覧を取得する指定対象パス
 */
async function readFilenames(path: string): Promise<Array<string>> {
    return new Promise((resolve, reject) => {
            fs.readdir(path, (err, files) => {
            if (files === undefined) {
                reject(err !== null ? err : "read filenames unknown error")
                return
            }
            resolve(files)
        })
    })
}

/**
 * 指定したファイル、ディレクトリの詳細な情報を取得する
 * @param path 詳細な情報を取得する対象パス
 */
async function fetchItem(path: string): Promise<Item> {
    return new Promise((resolve, reject) => {
        fs.stat(path, (err, stats) => {
            if (stats === undefined) {
                reject(err !== null ? err : "fetch file unknown error")
                return
            }
            resolve({
                path: path,
                stats: stats
            })
        })
    })
}

/**
 * 指定したディレクトリ、ファイルの一覧の詳細な情報を取得する
 * @param path 一覧を取得する指定対象パス
 */
async function fetchItems(path: string): Promise<Array<Item>> {
    const filenames = await readFilenames(path)
    return await Promise.all(filenames.map(async (filename) => {
        return await fetchItem(path + filename)
    }))
}

/**
 * 複数の無視条件から対象が該当するか検査する
 * 複数の条件の中1件でも当てはまる場合は無視の対象とする
 * @param ignoreItems 複数の無視条件
 * @param target 判定対象
 * @param shouldIgnoreFilter 無視判定を実施する関数
 */
function shouldIgnore<T, S>(
    ignoreItems: Array<T>, 
    target: S, 
    shouldIgnoreFilter: (ignoreItem: T, target: S) => boolean): boolean {
        return ignoreItems.reduce((acc, cur) => {
            if (acc) {
                return acc
            }
            if (shouldIgnoreFilter(cur, target)) {
                return true
            }
            return acc
        }, Boolean(false))
}

/**
 * 指定したディレクトリにある全てのファイルの詳細な情報を検索し取得する
 * @param path 検索対象となるディレクトリのパス
 * @param itemFilter 検索時に検索結果として追加するかどうかの判定用関数
 * @param sum 検索結果の一時保存用の変数
 */
async function searchRecursiveFiles(
    path: string, 
    itemFilter: (item: Item) => boolean = () => true,
    sum: Array<Item> = []): Promise<Array<Item>> {
    const items = await fetchItems(path)
    const reduced = items.reduce((acc, cur) => {
        if (!itemFilter(cur)) {
            return acc
        } else if (cur.stats.isFile()) {
            sum.push(cur)
        } else if (cur.stats.isDirectory()) {
            acc.directories.push(cur)
        }
        return acc
    }, {
        directories: Array<Item>()
    })
    const lowerHierarchyFiles = await Promise.all(
        reduced.directories.map(async (directory) => {
            return searchRecursiveFiles(directory.path + "/", itemFilter, sum)
        })
    )
    return sum.concat(Array<Item>().concat(...lowerHierarchyFiles))
}
