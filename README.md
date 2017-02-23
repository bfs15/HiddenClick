# HiddenClick
*Extension for chrome*

**Cache web pages before you click them.
Hover over links and load the pages in a minimized window or in the background.
Blazing fast navigation you will never want to go back from.
Frees tabs after loading is complete, or if you load/activate another page**

## Read Before Usage
* **Internet usage will increase significantly when browsing the web**
* **If you use window mode turn off chrome history sync. If you don't the extension will add hovered links to history. Extensions can remove history items reliably only with sync off**

## Background Mode
The script will get the HTML of the hovered link and requests the content it finds in it

## Window Mode
The extension will open a windows for the loading of pages, this is needed when the page has Cross Domain content

The tabs created are muted, and auto discardable. Tabs are discarted on completion so memory is freed (cache isn't)
They are not closed, to not pollute ctrl+shift+T

When you click a link it will discard all other tabs that are loading on its window
You can choose if the link you clicked will keep loading there *(Keep loading link on click, default: on)*
* In the case you do, image loading is not interrupted. Which will make it load faster, but will only appear once completly loaded instead of incrementally loading

*Uses https://purecss.io/*

*project started 18/2/2017 added to github 4 days later*
