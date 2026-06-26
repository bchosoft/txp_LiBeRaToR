//go:build windows

package main

import "syscall"

// hideFile sets the Windows "hidden" attribute on the given file.
func hideFile(path string) {
	p, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return
	}
	_ = syscall.SetFileAttributes(p, syscall.FILE_ATTRIBUTE_HIDDEN)
}
