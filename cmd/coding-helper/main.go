package main

import (
	"os"

	"github.com/shengsuan/coding-helper/internal/app"
)

func main() {
	if err := app.Run(os.Args[1:], os.Stdin, os.Stdout); err != nil {
		_, _ = os.Stderr.WriteString("错误：" + err.Error() + "\n")
		os.Exit(1)
	}
}
