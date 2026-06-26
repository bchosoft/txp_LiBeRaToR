//go:build !windows

package main

// hideFile is a no-op on non-Windows systems (dotfiles are already hidden).
func hideFile(path string) {}
